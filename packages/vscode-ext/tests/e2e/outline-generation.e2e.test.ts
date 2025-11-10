/**
 * E2E Test: Outline Generation Workflow
 * 
 * This test verifies the complete flow:
 * Command → Webview → Base → AISDK Hub → Storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExtensionServices } from '../../src/commands/types.js';
import { createGenerationOrchestrator } from '@ai-writer/base/orchestration';
import { createTemplateRegistry } from '@ai-writer/base/template';
import { createPersonaManager } from '@ai-writer/base/persona';
import { createAISDKHub } from '@ai-writer/base/provider';
import { createStorageGateway } from '@ai-writer/base/storage';
import { ConfigurationService, createInMemorySecretProvider } from '@ai-writer/base/config';
import { createMockLanguageModel } from '../helpers/mock-language-model.js';
import * as path from 'path';
import * as os from 'os';

describe('E2E: Outline Generation Workflow', () => {
  let services: Partial<ExtensionServices>;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test storage
    tempDir = path.join(os.tmpdir(), `ai-writer-test-${Date.now()}`);

    // Initialize all services
    const secretProvider = createInMemorySecretProvider();
    const configService = new ConfigurationService({ secretProvider });
    
    const storageGateway = createStorageGateway({
      pathConfig: {
        baseDir: tempDir,
        sessionsDir: path.join(tempDir, 'sessions'),
        templatesDir: path.join(tempDir, 'templates'),
        personasDir: path.join(tempDir, 'personas'),
        draftsDir: path.join(tempDir, 'drafts'),
      },
    });

    const templateRegistry = createTemplateRegistry();
    const personaManager = createPersonaManager({
      dependencies: { templateRegistry },
    });

    const aisdkHub = createAISDKHub();
    
    // Register mock provider
    const mockModel = createMockLanguageModel();
    aisdkHub.registerProvider({
      key: 'openai',
      model: mockModel,
      isConfigured: () => true,
    });

    const orchestrator = createGenerationOrchestrator({
      dependencies: {
        aisdkHub,
        storageGateway,
        templateRegistry,
        personaManager,
      },
    });

    services = {
      orchestrator,
      templateRegistry,
      personaManager,
      storageGateway,
      configService,
    };
  });

  it('should complete full outline generation cycle', async () => {
    // Step 1: Create a template
    const templateResult = await services.templateRegistry!.createTemplate({
      name: 'Technical Blog Template',
      points: [
        {
          id: 'intro',
          title: 'Introduction',
          instructions: 'Write a compelling introduction that hooks the reader',
          priority: 100,
        },
        {
          id: 'main',
          title: 'Main Content',
          instructions: 'Provide detailed technical explanation',
          priority: 90,
        },
      ],
      personaHints: ['technical', 'beginner-friendly'],
    });

    expect(templateResult.kind).toBe('ok');
    const template = templateResult.kind === 'ok' ? templateResult.value : null;
    expect(template).toBeDefined();

    // Step 2: Create a persona
    const personaResult = await services.personaManager!.upsertPersona({
      name: 'Tech Blogger',
      tone: 'professional',
      audience: 'developers',
      toggles: {
        useExamples: true,
        includeCodeSnippets: true,
      },
    });

    expect(personaResult.kind).toBe('ok');
    const persona = personaResult.kind === 'ok' ? personaResult.value : null;
    expect(persona).toBeDefined();

    // Step 3: Start outline generation cycle
    const outlineResult = await services.orchestrator!.startOutlineCycle({
      idea: 'How to build a VSCode extension',
      templateId: template!.id,
      personaId: persona!.id,
      historyDepth: 0,
    });

    expect(outlineResult.kind).toBe('ok');
    if (outlineResult.kind === 'ok') {
      const summary = outlineResult.value;
      
      // Verify session was created
      expect(summary.sessionId).toBeDefined();
      expect(summary.outline).toBeDefined();
      expect(summary.outline.sections).toBeDefined();

      // Step 4: Verify session can be retrieved
      const sessionResult = await services.orchestrator!.getSession(summary.sessionId);
      expect(sessionResult.kind).toBe('ok');
      
      if (sessionResult.kind === 'ok') {
        const session = sessionResult.value;
        expect(session.id).toBe(summary.sessionId);
        expect(session.mode).toBe('outline');
        expect(session.templateId).toBe(template!.id);
        expect(session.personaId).toBe(persona!.id);

        // Step 5: Execute a generation step
        const resumeResult = await services.orchestrator!.resumeSession(
          summary.sessionId,
          {
            type: 'generate',
            payload: 'Generate an outline for a VSCode extension tutorial',
          }
        );

        expect(resumeResult.kind).toBe('ok');
        
        if (resumeResult.kind === 'ok') {
          const updatedSession = resumeResult.value;
          
          // Verify step was recorded
          expect(updatedSession.steps.length).toBeGreaterThan(0);
          const lastStep = updatedSession.steps[updatedSession.steps.length - 1];
          expect(lastStep.type).toBe('generate');
          expect(lastStep.output).toBeDefined();

          // Step 6: Verify session was saved to storage
          const loadedSessionResult = await services.storageGateway!.loadSession(summary.sessionId);
          expect(loadedSessionResult.kind).toBe('ok');
        }
      }
    }
  });

  it('should handle template compliance checking', async () => {
    // Create template with specific requirements
    const templateResult = await services.templateRegistry!.createTemplate({
      name: 'Compliance Test Template',
      points: [
        {
          id: 'req1',
          title: 'Required Section',
          instructions: 'Must include specific keywords',
          priority: 100,
        },
      ],
    });

    expect(templateResult.kind).toBe('ok');
    const template = templateResult.kind === 'ok' ? templateResult.value : null;

    // Start cycle
    const outlineResult = await services.orchestrator!.startOutlineCycle({
      idea: 'Test compliance checking',
      templateId: template!.id,
      historyDepth: 0,
    });

    expect(outlineResult.kind).toBe('ok');
    if (outlineResult.kind === 'ok') {
      const summary = outlineResult.value;

      // Record compliance
      await services.templateRegistry!.recordCompliance(
        summary.sessionId,
        'req1',
        {
          sessionId: summary.sessionId,
          pointId: 'req1',
          adhered: true,
          notes: 'All requirements met',
          timestamp: new Date().toISOString(),
        }
      );

      // Get compliance report
      const reportResult = await services.templateRegistry!.getComplianceReport(summary.sessionId);
      expect(reportResult.kind).toBe('ok');
      
      if (reportResult.kind === 'ok') {
        const report = reportResult.value;
        expect(report.totalPoints).toBe(1);
        expect(report.compliantPoints).toBe(1);
        expect(report.complianceRate).toBe(1);
      }
    }
  });

  it('should handle error scenarios gracefully', async () => {
    // Test invalid input
    const invalidResult = await services.orchestrator!.startOutlineCycle({
      idea: '', // Empty idea
      historyDepth: 0,
    });

    expect(invalidResult.kind).toBe('err');
    if (invalidResult.kind === 'err') {
      expect(invalidResult.error.code).toBe('validation_error');
      expect(invalidResult.error.recoverable).toBe(false);
    }

    // Test non-existent session
    const sessionResult = await services.orchestrator!.getSession('non-existent-session');
    expect(sessionResult.kind).toBe('err');
    if (sessionResult.kind === 'err') {
      expect(sessionResult.error.code).toBe('invalid_state');
    }
  });

  it('should persist and restore session state', async () => {
    // Create and start a session
    const outlineResult = await services.orchestrator!.startOutlineCycle({
      idea: 'Persistence test',
      historyDepth: 0,
    });

    expect(outlineResult.kind).toBe('ok');
    if (outlineResult.kind === 'ok') {
      const sessionId = outlineResult.value.sessionId;

      // Execute a step
      await services.orchestrator!.resumeSession(sessionId, {
        type: 'generate',
        payload: 'Generate test content',
      });

      // Load from storage
      const loadedResult = await services.storageGateway!.loadSession(sessionId);
      expect(loadedResult.kind).toBe('ok');
      
      if (loadedResult.kind === 'ok') {
        const loadedSession = loadedResult.value;
        expect(loadedSession.id).toBe(sessionId);
        expect(loadedSession.steps.length).toBeGreaterThan(0);
      }
    }
  });
});
