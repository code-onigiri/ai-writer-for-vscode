import { describe, it, expect } from 'vitest';
import { createGenerationOrchestrator } from '../src/orchestration/generation-orchestrator.js';
import type { OutlineInput, DraftInput } from '../src/orchestration/types.js';

describe('GenerationOrchestrator', () => {
  describe('startOutlineCycle', () => {
    it('should create a new outline session with valid input', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Write an article about AI in education',
        historyDepth: 5,
      };

      const result = await orchestrator.startOutlineCycle(input);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.sessionId).toBeTruthy();
        expect(result.value.outline).toBeDefined();
        expect(result.value.outline.sections).toEqual([]);
        expect(result.value.auditTrail).toEqual([]);
      }
    });

    it('should reject empty idea', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: '',
        historyDepth: 5,
      };

      const result = await orchestrator.startOutlineCycle(input);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('validation_error');
        expect(result.error.message).toContain('Idea is required');
      }
    });

    it('should reject negative history depth', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Valid idea',
        historyDepth: -1,
      };

      const result = await orchestrator.startOutlineCycle(input);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('validation_error');
        expect(result.error.message).toContain('History depth must be non-negative');
      }
    });

    it('should accept optional personaId and templateId', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Test idea',
        personaId: 'persona-123',
        templateId: 'template-456',
        historyDepth: 3,
      };

      const result = await orchestrator.startOutlineCycle(input);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        const session = await orchestrator.getSession(result.value.sessionId);
        expect(session.kind).toBe('ok');
        if (session.kind === 'ok') {
          expect(session.value.personaId).toBe('persona-123');
          expect(session.value.templateId).toBe('template-456');
        }
      }
    });
  });

  describe('startDraftCycle', () => {
    it('should create a new draft session with valid input', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: DraftInput = {
        outlineId: 'outline-123',
      };

      const result = await orchestrator.startDraftCycle(input);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.sessionId).toBeTruthy();
        expect(result.value.draft).toBeDefined();
        expect(result.value.draft.outlineId).toBe('outline-123');
        expect(result.value.draft.sections).toEqual([]);
        expect(result.value.auditTrail).toEqual([]);
      }
    });

    it('should reject empty outline ID', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: DraftInput = {
        outlineId: '',
      };

      const result = await orchestrator.startDraftCycle(input);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('validation_error');
        expect(result.error.message).toContain('Outline ID is required');
      }
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Test idea',
        historyDepth: 5,
      };

      const createResult = await orchestrator.startOutlineCycle(input);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const sessionId = createResult.value.sessionId;
        const getResult = await orchestrator.getSession(sessionId);

        expect(getResult.kind).toBe('ok');
        if (getResult.kind === 'ok') {
          expect(getResult.value.id).toBe(sessionId);
          expect(getResult.value.mode).toBe('outline');
          expect(getResult.value.currentState.nextRequiredStep).toBe('generate');
        }
      }
    });

    it('should return error for non-existent session', async () => {
      const orchestrator = createGenerationOrchestrator();
      const result = await orchestrator.getSession('non-existent-session');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_state');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('resumeSession', () => {
    it('should handle valid iteration step', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Test idea',
        historyDepth: 5,
      };

      const createResult = await orchestrator.startOutlineCycle(input);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const sessionId = createResult.value.sessionId;
        const step = {
          type: 'generate' as const,
          payload: { content: 'Generated outline' },
        };

        const resumeResult = await orchestrator.resumeSession(sessionId, step);

        expect(resumeResult.kind).toBe('ok');
        if (resumeResult.kind === 'ok') {
          expect(resumeResult.value.currentState.nextRequiredStep).toBe('critique');
          expect(resumeResult.value.steps.length).toBe(1);
          expect(resumeResult.value.steps[0].type).toBe('generate');
        }
      }
    });

    it('should reject invalid iteration step', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Test idea',
        historyDepth: 5,
      };

      const createResult = await orchestrator.startOutlineCycle(input);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const sessionId = createResult.value.sessionId;
        // Try to skip directly to critique without generate
        const step = {
          type: 'critique' as const,
          payload: { content: 'Critique' },
        };

        const resumeResult = await orchestrator.resumeSession(sessionId, step);

        expect(resumeResult.kind).toBe('err');
        if (resumeResult.kind === 'err') {
          expect(resumeResult.error.code).toBe('invalid_state');
        }
      }
    });
  });

  describe('applyTemplatePoint', () => {
    it('should return evaluation for valid session', async () => {
      const orchestrator = createGenerationOrchestrator();
      const input: OutlineInput = {
        idea: 'Test idea',
        templateId: 'template-123',
        historyDepth: 5,
      };

      const createResult = await orchestrator.startOutlineCycle(input);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const sessionId = createResult.value.sessionId;
        const result = await orchestrator.applyTemplatePoint(sessionId, 'point-1');

        expect(result.kind).toBe('ok');
        if (result.kind === 'ok') {
          expect(result.value.pointId).toBe('point-1');
          expect(result.value.compliant).toBeDefined();
        }
      }
    });

    it('should return error for non-existent session', async () => {
      const orchestrator = createGenerationOrchestrator();
      const result = await orchestrator.applyTemplatePoint('non-existent', 'point-1');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_state');
      }
    });
  });
});
