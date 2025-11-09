import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createStorageGateway } from '../src/storage/storage-gateway.js';
import type { SessionSnapshot } from '../src/orchestration/types.js';
import type { TemplateDescriptor } from '../src/template/types.js';
import type { PersonaDefinition } from '../src/persona/types.js';
import type { StoragePathConfig } from '../src/storage/types.js';

describe('StorageGateway', () => {
  const testBaseDir = path.join('/tmp', 'test-storage-' + Date.now());
  let pathConfig: StoragePathConfig;

  beforeEach(async () => {
    pathConfig = {
      baseDir: testBaseDir,
      sessionsDir: path.join(testBaseDir, 'sessions'),
      templatesDir: path.join(testBaseDir, 'templates'),
      personasDir: path.join(testBaseDir, 'personas'),
      logsDir: path.join(testBaseDir, 'logs'),
    };
    
    // Ensure test directories exist
    await fs.mkdir(testBaseDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Session operations', () => {
    it('should save and load a session', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const session: SessionSnapshot = {
        id: 'session-123',
        mode: 'outline',
        steps: [],
        currentState: {
          mode: 'outline',
          status: 'active',
          cycle: 1,
          history: [],
          nextRequiredStep: 'generate',
          canApprove: false,
        },
        outputs: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saveResult = await gateway.saveSession(session);
      expect(saveResult.kind).toBe('ok');

      const loadResult = await gateway.loadSession('session-123');
      expect(loadResult.kind).toBe('ok');
      
      if (loadResult.kind === 'ok') {
        expect(loadResult.value.id).toBe('session-123');
        expect(loadResult.value.mode).toBe('outline');
      }
    });

    it('should return error when loading non-existent session', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const result = await gateway.loadSession('non-existent');
      
      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('file_not_found');
      }
    });

    it('should list all sessions', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const session1: SessionSnapshot = {
        id: 'session-1',
        mode: 'outline',
        steps: [],
        currentState: {
          mode: 'outline',
          status: 'active',
          cycle: 1,
          history: [],
          nextRequiredStep: 'generate',
          canApprove: false,
        },
        outputs: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const session2: SessionSnapshot = {
        ...session1,
        id: 'session-2',
      };

      await gateway.saveSession(session1);
      await gateway.saveSession(session2);

      const listResult = await gateway.listSessions();
      expect(listResult.kind).toBe('ok');
      
      if (listResult.kind === 'ok') {
        expect(listResult.value.length).toBe(2);
        expect(listResult.value).toContain('session-1');
        expect(listResult.value).toContain('session-2');
      }
    });

    it('should delete a session', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const session: SessionSnapshot = {
        id: 'session-delete',
        mode: 'outline',
        steps: [],
        currentState: {
          mode: 'outline',
          status: 'active',
          cycle: 1,
          history: [],
          nextRequiredStep: 'generate',
          canApprove: false,
        },
        outputs: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await gateway.saveSession(session);
      
      const deleteResult = await gateway.deleteSession('session-delete');
      expect(deleteResult.kind).toBe('ok');

      const loadResult = await gateway.loadSession('session-delete');
      expect(loadResult.kind).toBe('err');
    });
  });

  describe('Template operations', () => {
    it('should save and load a template', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const template: TemplateDescriptor = {
        id: 'template-123',
        name: 'Test Template',
        points: [
          {
            id: 'point-1',
            title: 'Introduction',
            instructions: 'Write a clear introduction',
            priority: 1,
          },
        ],
        metadata: {
          personaHints: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const saveResult = await gateway.saveTemplate(template);
      expect(saveResult.kind).toBe('ok');

      const loadResult = await gateway.loadTemplate('template-123');
      expect(loadResult.kind).toBe('ok');
      
      if (loadResult.kind === 'ok') {
        expect(loadResult.value.id).toBe('template-123');
        expect(loadResult.value.name).toBe('Test Template');
      }
    });

    it('should list all templates', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const template1: TemplateDescriptor = {
        id: 'template-1',
        name: 'Template 1',
        points: [],
        metadata: {
          personaHints: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const template2: TemplateDescriptor = {
        ...template1,
        id: 'template-2',
        name: 'Template 2',
      };

      await gateway.saveTemplate(template1);
      await gateway.saveTemplate(template2);

      const listResult = await gateway.listTemplates();
      expect(listResult.kind).toBe('ok');
      
      if (listResult.kind === 'ok') {
        expect(listResult.value.length).toBe(2);
        expect(listResult.value).toContain('template-1');
        expect(listResult.value).toContain('template-2');
      }
    });
  });

  describe('Persona operations', () => {
    it('should save and load a persona', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const persona: PersonaDefinition = {
        id: 'persona-123',
        name: 'Professional Writer',
        tone: 'formal',
        audience: 'business professionals',
        toggles: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const saveResult = await gateway.savePersona(persona);
      expect(saveResult.kind).toBe('ok');

      const loadResult = await gateway.loadPersona('persona-123');
      expect(loadResult.kind).toBe('ok');
      
      if (loadResult.kind === 'ok') {
        expect(loadResult.value.id).toBe('persona-123');
        expect(loadResult.value.name).toBe('Professional Writer');
      }
    });

    it('should list all personas', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const persona1: PersonaDefinition = {
        id: 'persona-1',
        name: 'Persona 1',
        tone: 'casual',
        audience: 'general',
        toggles: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await gateway.savePersona(persona1);

      const listResult = await gateway.listPersonas();
      expect(listResult.kind).toBe('ok');
      
      if (listResult.kind === 'ok') {
        expect(listResult.value.length).toBe(1);
        expect(listResult.value).toContain('persona-1');
      }
    });
  });

  describe('Draft commit operations', () => {
    it('should commit a draft', async () => {
      const gateway = createStorageGateway({ pathConfig });
      
      const commitInput = {
        sessionId: 'session-draft-123',
        message: 'Initial draft',
        content: '# Test Draft\n\nThis is test content.',
      };

      const result = await gateway.commitDraft(commitInput);
      expect(result.kind).toBe('ok');
      
      if (result.kind === 'ok') {
        expect(result.value).toContain('session-draft-123.md');
      }
    });
  });
});
