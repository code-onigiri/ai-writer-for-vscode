import { describe, it, expect } from 'vitest';
import { createTemplateRegistry } from '../src/template/template-registry.js';
import type { TemplateDraft, ComplianceSnapshot } from '../src/template/types.js';

describe('TemplateRegistry', () => {
  describe('createTemplate', () => {
    it('should create a new template with valid input', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: 'Technical Writing Template',
        personaHints: ['professional', 'technical'],
        points: [
          {
            id: 'point-1',
            title: 'Introduction',
            instructions: 'Write a clear introduction',
            priority: 1,
          },
          {
            id: 'point-2',
            title: 'Body',
            instructions: 'Provide detailed explanations',
            priority: 2,
          },
        ],
      };

      const result = await registry.createTemplate(draft);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.id).toBeTruthy();
        expect(result.value.name).toBe('Technical Writing Template');
        expect(result.value.points.length).toBe(2);
        expect(result.value.metadata.personaHints).toEqual(['professional', 'technical']);
        expect(result.value.metadata.createdAt).toBeTruthy();
        expect(result.value.metadata.updatedAt).toBeTruthy();
      }
    });

    it('should reject template with empty name', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: '',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };

      const result = await registry.createTemplate(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_template');
        expect(result.error.message).toContain('name is required');
      }
    });

    it('should reject template with no points', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: 'Test Template',
        points: [],
      };

      const result = await registry.createTemplate(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_template');
        expect(result.error.message).toContain('at least one point');
      }
    });

    it('should reject template with duplicate point IDs', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: 'Test Template',
        points: [
          {
            id: 'point-1',
            title: 'First',
            instructions: 'First instructions',
            priority: 1,
          },
          {
            id: 'point-1',
            title: 'Second',
            instructions: 'Second instructions',
            priority: 2,
          },
        ],
      };

      const result = await registry.createTemplate(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('invalid_point');
        expect(result.error.message).toContain('Duplicate point ID');
      }
    });

    it('should reject duplicate template names', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: 'Unique Template',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };

      await registry.createTemplate(draft);
      const result = await registry.createTemplate(draft);

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('duplicate_template');
        expect(result.error.message).toContain('already exists');
      }
    });
  });

  describe('loadTemplate', () => {
    it('should load an existing template', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
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

      const createResult = await registry.createTemplate(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const loadResult = await registry.loadTemplate(createResult.value.id);

        expect(loadResult.kind).toBe('ok');
        if (loadResult.kind === 'ok') {
          expect(loadResult.value.id).toBe(createResult.value.id);
          expect(loadResult.value.name).toBe('Test Template');
        }
      }
    });

    it('should return error for non-existent template', async () => {
      const registry = createTemplateRegistry();
      const result = await registry.loadTemplate('non-existent-id');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('template_not_found');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
        name: 'Original Name',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };

      const createResult = await registry.createTemplate(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const updateResult = await registry.updateTemplate(createResult.value.id, {
          name: 'Updated Name',
        });

        expect(updateResult.kind).toBe('ok');
        if (updateResult.kind === 'ok') {
          expect(updateResult.value.name).toBe('Updated Name');
          // updatedAt should be defined (timestamp equality check is too fragile)
          expect(updateResult.value.metadata.updatedAt).toBeTruthy();
        }
      }
    });

    it('should return error when updating to duplicate name', async () => {
      const registry = createTemplateRegistry();
      const draft1: TemplateDraft = {
        name: 'Template 1',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };
      const draft2: TemplateDraft = {
        name: 'Template 2',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };

      await registry.createTemplate(draft1);
      const createResult2 = await registry.createTemplate(draft2);
      expect(createResult2.kind).toBe('ok');

      if (createResult2.kind === 'ok') {
        const updateResult = await registry.updateTemplate(createResult2.value.id, {
          name: 'Template 1',
        });

        expect(updateResult.kind).toBe('err');
        if (updateResult.kind === 'err') {
          expect(updateResult.error.code).toBe('duplicate_template');
        }
      }
    });
  });

  describe('deleteTemplate', () => {
    it('should delete an existing template', async () => {
      const registry = createTemplateRegistry();
      const draft: TemplateDraft = {
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

      const createResult = await registry.createTemplate(draft);
      expect(createResult.kind).toBe('ok');

      if (createResult.kind === 'ok') {
        const deleteResult = await registry.deleteTemplate(createResult.value.id);
        expect(deleteResult.kind).toBe('ok');

        // Verify it's deleted
        const loadResult = await registry.loadTemplate(createResult.value.id);
        expect(loadResult.kind).toBe('err');
      }
    });

    it('should return error for non-existent template', async () => {
      const registry = createTemplateRegistry();
      const result = await registry.deleteTemplate('non-existent-id');

      expect(result.kind).toBe('err');
      if (result.kind === 'err') {
        expect(result.error.code).toBe('template_not_found');
      }
    });
  });

  describe('listTemplates', () => {
    it('should return empty list when no templates exist', async () => {
      const registry = createTemplateRegistry();
      const result = await registry.listTemplates();

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(0);
      }
    });

    it('should return all templates', async () => {
      const registry = createTemplateRegistry();
      const draft1: TemplateDraft = {
        name: 'Template 1',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };
      const draft2: TemplateDraft = {
        name: 'Template 2',
        points: [
          {
            id: 'point-1',
            title: 'Test',
            instructions: 'Test instructions',
            priority: 1,
          },
        ],
      };

      await registry.createTemplate(draft1);
      await registry.createTemplate(draft2);

      const result = await registry.listTemplates();

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(2);
        expect(result.value.some((t) => t.name === 'Template 1')).toBe(true);
        expect(result.value.some((t) => t.name === 'Template 2')).toBe(true);
      }
    });
  });

  describe('recordCompliance and getComplianceHistory', () => {
    it('should record and retrieve compliance snapshots', async () => {
      const registry = createTemplateRegistry();
      const sessionId = 'session-123';
      const compliance1: ComplianceSnapshot = {
        pointId: 'point-1',
        adhered: true,
        notes: 'Followed instructions',
        evidence: 'Content matches requirements',
        timestamp: new Date().toISOString(),
      };
      const compliance2: ComplianceSnapshot = {
        pointId: 'point-2',
        adhered: false,
        notes: 'Needs improvement',
        evidence: 'Missing key elements',
        timestamp: new Date().toISOString(),
      };

      await registry.recordCompliance(sessionId, 'point-1', compliance1);
      await registry.recordCompliance(sessionId, 'point-2', compliance2);

      const result = await registry.getComplianceHistory(sessionId);

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(2);
        expect(result.value[0].pointId).toBe('point-1');
        expect(result.value[0].adhered).toBe(true);
        expect(result.value[1].pointId).toBe('point-2');
        expect(result.value[1].adhered).toBe(false);
      }
    });

    it('should return empty history for session with no compliance records', async () => {
      const registry = createTemplateRegistry();
      const result = await registry.getComplianceHistory('non-existent-session');

      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.length).toBe(0);
      }
    });
  });
});
