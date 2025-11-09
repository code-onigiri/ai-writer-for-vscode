import { describe, it, expect } from 'vitest';
import { createPersonaManager } from '../src/persona/persona-manager.js';
import { createTemplateRegistry } from '../src/template/template-registry.js';
import type { PersonaDraft, PersonaApplicationHistory } from '../src/persona/types.js';
import type { TemplateDraft } from '../src/template/types.js';

describe('PersonaManager', () => {
  describe('upsertPersona', () => {
    it('should create a new persona with valid input', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Professional Writer',
        tone: 'formal',
        audience: 'business professionals',
        toggles: { 'use-jargon': true, 'emoji': false },
        source: 'manual-input',
      };

      const result = await manager.upsertPersona(draft);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.id).toBeTruthy();
        expect(result.value.name).toBe('Professional Writer');
        expect(result.value.tone).toBe('formal');
        expect(result.value.audience).toBe('business professionals');
        expect(result.value.toggles['use-jargon']).toBe(true);
        expect(result.value.metadata.createdAt).toBeTruthy();
        expect(result.value.metadata.source).toBe('manual-input');
      }
    });

    it('should update existing persona with same name', async () => {
      const manager = createPersonaManager();
      const draft1: PersonaDraft = {
        name: 'Tech Blogger',
        tone: 'casual',
        audience: 'tech enthusiasts',
      };
      const draft2: PersonaDraft = {
        name: 'Tech Blogger',
        tone: 'professional',
        audience: 'developers',
      };

      const result1 = await manager.upsertPersona(draft1);
      expect(result1.kind).toBe('ok');

      const result2 = await manager.upsertPersona(draft2);
      expect(result2.kind).toBe('ok');

      if (result1.kind === 'ok' && result2.kind === 'ok') {
        expect(result2.value.id).toBe(result1.value.id);
        expect(result2.value.tone).toBe('professional');
        expect(result2.value.audience).toBe('developers');
      }
    });

    it('should reject persona with empty name', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: '',
        tone: 'casual',
        audience: 'general',
      };

      const result = await manager.upsertPersona(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_persona');
        expect(result.error.message).toContain('name is required');
      }
    });

    it('should reject persona with empty tone', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Test Persona',
        tone: '',
        audience: 'general',
      };

      const result = await manager.upsertPersona(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_persona');
        expect(result.error.message).toContain('tone is required');
      }
    });

    it('should reject persona with empty audience', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Test Persona',
        tone: 'casual',
        audience: '',
      };

      const result = await manager.upsertPersona(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_persona');
        expect(result.error.message).toContain('audience is required');
      }
    });
  });

  describe('getPersona', () => {
    it('should retrieve an existing persona', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Test Persona',
        tone: 'casual',
        audience: 'general',
      };

      const createResult = await manager.upsertPersona(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const getResult = await manager.getPersona(createResult.value.id);

        expect(getResult.kind).toBe('ok');
        if (getResult.kind === 'ok') {
          expect(getResult.value.id).toBe(createResult.value.id);
          expect(getResult.value.name).toBe('Test Persona');
        }
      }
    });

    it('should return error for non-existent persona', async () => {
      const manager = createPersonaManager();
      const result = await manager.getPersona('non-existent-id');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('persona_not_found');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('updatePersona', () => {
    it('should update an existing persona', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Original Persona',
        tone: 'casual',
        audience: 'general',
      };

      const createResult = await manager.upsertPersona(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const updateResult = await manager.updatePersona(createResult.value.id, {
          tone: 'formal',
          audience: 'professionals',
        });

        expect(updateResult.kind).toBe('ok');
        if (updateResult.kind === 'ok') {
          expect(updateResult.value.tone).toBe('formal');
          expect(updateResult.value.audience).toBe('professionals');
          expect(updateResult.value.name).toBe('Original Persona');
        }
      }
    });

    it('should return error when updating to duplicate name', async () => {
      const manager = createPersonaManager();
      const draft1: PersonaDraft = {
        name: 'Persona 1',
        tone: 'casual',
        audience: 'general',
      };
      const draft2: PersonaDraft = {
        name: 'Persona 2',
        tone: 'formal',
        audience: 'business',
      };

      await manager.upsertPersona(draft1);
      const createResult2 = await manager.upsertPersona(draft2);
      expect(createResult2.kind).toBe('ok');

      if (createResult2.kind === 'ok') {
        const updateResult = await manager.updatePersona(createResult2.value.id, {
          name: 'Persona 1',
        });

        expect(updateResult.kind).toBe('err');
        if (updateResult.kind === 'err') {
          expect(updateResult.error.code).toBe('duplicate_persona');
        }
      }
    });
  });

  describe('deletePersona', () => {
    it('should delete an existing persona', async () => {
      const manager = createPersonaManager();
      const draft: PersonaDraft = {
        name: 'Test Persona',
        tone: 'casual',
        audience: 'general',
      };

      const createResult = await manager.upsertPersona(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const deleteResult = await manager.deletePersona(createResult.value.id);
        expect(deleteResult.kind).toBe('ok');

        // Verify it's deleted
        const getResult = await manager.getPersona(createResult.value.id);
        expect(getResult.kind).toBe('err');
      }
    });

    it('should return error for non-existent persona', async () => {
      const manager = createPersonaManager();
      const result = await manager.deletePersona('non-existent-id');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('persona_not_found');
      }
    });
  });

  describe('listPersonas', () => {
    it('should return empty list when no personas exist', async () => {
      const manager = createPersonaManager();
      const result = await manager.listPersonas();

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(0);
      }
    });

    it('should return all personas', async () => {
      const manager = createPersonaManager();
      const draft1: PersonaDraft = {
        name: 'Persona 1',
        tone: 'casual',
        audience: 'general',
      };
      const draft2: PersonaDraft = {
        name: 'Persona 2',
        tone: 'formal',
        audience: 'business',
      };

      await manager.upsertPersona(draft1);
      await manager.upsertPersona(draft2);

      const result = await manager.listPersonas();

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(2);
        expect(result.value.some((p) => p.name === 'Persona 1')).toBe(true);
        expect(result.value.some((p) => p.name === 'Persona 2')).toBe(true);
      }
    });
  });

  describe('applyPersona', () => {
    it('should apply persona to template', async () => {
      const templateRegistry = createTemplateRegistry();
      const manager = createPersonaManager({ dependencies: { templateRegistry } });

      // Create template
      const templateDraft: TemplateDraft = {
        name: 'Test Template',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };
      const templateResult = await templateRegistry.createTemplate(templateDraft);
      expect(templateResult.kind).toBe('ok');

      // Create persona
      const personaDraft: PersonaDraft = {
        name: 'Test Persona',
        tone: 'formal',
        audience: 'professionals',
      };
      const personaResult = await manager.upsertPersona(personaDraft);
      expect(personaResult.kind).toBe('ok');

      // Apply persona
      if (templateResult.kind === 'ok' && personaResult.kind === 'ok') {
        const applyResult = await manager.applyPersona(
          templateResult.value.id,
          personaResult.value.id,
        );

        expect(applyResult.kind).toBe('ok');
        if (applyResult.kind === 'ok') {
          expect(applyResult.value.metadata.personaHints).toContain('tone:formal');
          expect(applyResult.value.metadata.personaHints).toContain('audience:professionals');
        }
      }
    });

    it('should return error for non-existent persona', async () => {
      const templateRegistry = createTemplateRegistry();
      const manager = createPersonaManager({ dependencies: { templateRegistry } });

      const result = await manager.applyPersona('template-123', 'non-existent-persona');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('persona_not_found');
      }
    });

    it('should return error when template registry not available', async () => {
      const manager = createPersonaManager();

      const personaDraft: PersonaDraft = {
        name: 'Test Persona',
        tone: 'formal',
        audience: 'professionals',
      };
      const personaResult = await manager.upsertPersona(personaDraft);
      expect(personaResult.kind).toBe('ok');

      if (personaResult.kind === 'ok') {
        const result = await manager.applyPersona('template-123', personaResult.value.id);

        expect(result.kind).toBe('err');
        if (result.kind === 'err') {
          expect(result.error.code).toBe('template_not_found');
        }
      }
    });
  });

  describe('recordApplication and getApplicationHistory', () => {
    it('should record and retrieve application history', async () => {
      const manager = createPersonaManager();
      const sessionId = 'session-123';

      const history1: PersonaApplicationHistory = {
        sessionId,
        personaId: 'persona-1',
        templateId: 'template-1',
        appliedAt: new Date().toISOString(),
        parameters: { tone: 'formal' },
      };
      const history2: PersonaApplicationHistory = {
        sessionId,
        personaId: 'persona-2',
        appliedAt: new Date().toISOString(),
        parameters: { tone: 'casual' },
      };

      await manager.recordApplication(history1);
      await manager.recordApplication(history2);

      const result = await manager.getApplicationHistory(sessionId);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(2);
        expect(result.value[0].personaId).toBe('persona-1');
        expect(result.value[1].personaId).toBe('persona-2');
      }
    });

    it('should return empty history for session with no applications', async () => {
      const manager = createPersonaManager();
      const result = await manager.getApplicationHistory('non-existent-session');

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(0);
      }
    });
  });
});
