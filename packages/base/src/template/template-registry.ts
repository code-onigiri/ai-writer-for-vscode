import type {
  ComplianceSnapshot,
  TemplateDescriptor,
  TemplateDraft,
  TemplateError,
  TemplatePoint,
  TemplateResult,
} from './types.js';

/**
 * Template Registry interface
 */
export interface TemplateRegistry {
  createTemplate(input: TemplateDraft): Promise<TemplateResult<TemplateDescriptor>>;
  loadTemplate(id: string): Promise<TemplateResult<TemplateDescriptor>>;
  updateTemplate(id: string, updates: Partial<TemplateDraft>): Promise<TemplateResult<TemplateDescriptor>>;
  deleteTemplate(id: string): Promise<TemplateResult<void>>;
  listTemplates(): Promise<TemplateResult<readonly TemplateDescriptor[]>>;
  recordCompliance(sessionId: string, pointId: string, compliance: ComplianceSnapshot): Promise<void>;
  getComplianceHistory(sessionId: string): Promise<TemplateResult<readonly ComplianceSnapshot[]>>;
}

/**
 * Template storage for in-memory persistence
 */
interface TemplateStore {
  [templateId: string]: TemplateDescriptor;
}

/**
 * Compliance storage for session compliance history
 */
interface ComplianceStore {
  [sessionId: string]: ComplianceSnapshot[];
}

/**
 * Creates a Template Registry instance
 */
export function createTemplateRegistry(): TemplateRegistry {
  const templates: TemplateStore = {};
  const compliance: ComplianceStore = {};

  return {
    createTemplate: async (input: TemplateDraft) => {
      return createTemplateImpl(input, templates);
    },
    loadTemplate: async (id: string) => {
      return loadTemplateImpl(id, templates);
    },
    updateTemplate: async (id: string, updates: Partial<TemplateDraft>) => {
      return updateTemplateImpl(id, updates, templates);
    },
    deleteTemplate: async (id: string) => {
      return deleteTemplateImpl(id, templates);
    },
    listTemplates: async () => {
      return listTemplatesImpl(templates);
    },
    recordCompliance: async (sessionId: string, pointId: string, complianceData: ComplianceSnapshot) => {
      return recordComplianceImpl(sessionId, pointId, complianceData, compliance);
    },
    getComplianceHistory: async (sessionId: string) => {
      return getComplianceHistoryImpl(sessionId, compliance);
    },
  };
}

/**
 * Implementation of createTemplate
 */
async function createTemplateImpl(
  input: TemplateDraft,
  templates: TemplateStore,
): Promise<TemplateResult<TemplateDescriptor>> {
  // Validate input
  const validationError = validateTemplateDraft(input);
  if (validationError) {
    return { kind: 'err', error: validationError };
  }

  // Check for duplicate names
  const existingTemplate = Object.values(templates).find((t) => t.name === input.name);
  if (existingTemplate) {
    return {
      kind: 'err',
      error: createTemplateError('duplicate_template', `Template with name "${input.name}" already exists`, false),
    };
  }

  // Create template
  const timestamp = new Date().toISOString();
  const template: TemplateDescriptor = {
    id: generateTemplateId(),
    name: input.name,
    points: [...input.points],
    metadata: {
      personaHints: input.personaHints ? [...input.personaHints] : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  // Store template
  templates[template.id] = template;

  return { kind: 'ok', value: template };
}

/**
 * Implementation of loadTemplate
 */
async function loadTemplateImpl(
  id: string,
  templates: TemplateStore,
): Promise<TemplateResult<TemplateDescriptor>> {
  const template = templates[id];
  if (!template) {
    return {
      kind: 'err',
      error: createTemplateError('template_not_found', `Template with ID "${id}" not found`, false),
    };
  }

  return { kind: 'ok', value: template };
}

/**
 * Implementation of updateTemplate
 */
async function updateTemplateImpl(
  id: string,
  updates: Partial<TemplateDraft>,
  templates: TemplateStore,
): Promise<TemplateResult<TemplateDescriptor>> {
  const template = templates[id];
  if (!template) {
    return {
      kind: 'err',
      error: createTemplateError('template_not_found', `Template with ID "${id}" not found`, false),
    };
  }

  // Check for duplicate names if name is being updated
  if (updates.name && updates.name !== template.name) {
    const existingTemplate = Object.values(templates).find(
      (t) => t.id !== id && t.name === updates.name,
    );
    if (existingTemplate) {
      return {
        kind: 'err',
        error: createTemplateError(
          'duplicate_template',
          `Template with name "${updates.name}" already exists`,
          false,
        ),
      };
    }
  }

  // Update template
  const updatedTemplate: TemplateDescriptor = {
    ...template,
    name: updates.name ?? template.name,
    points: updates.points ? [...updates.points] : template.points,
    metadata: {
      ...template.metadata,
      personaHints: updates.personaHints ? [...updates.personaHints] : template.metadata.personaHints,
      updatedAt: new Date().toISOString(),
    },
  };

  templates[id] = updatedTemplate;

  return { kind: 'ok', value: updatedTemplate };
}

/**
 * Implementation of deleteTemplate
 */
async function deleteTemplateImpl(id: string, templates: TemplateStore): Promise<TemplateResult<void>> {
  const template = templates[id];
  if (!template) {
    return {
      kind: 'err',
      error: createTemplateError('template_not_found', `Template with ID "${id}" not found`, false),
    };
  }

  delete templates[id];

  return { kind: 'ok', value: undefined };
}

/**
 * Implementation of listTemplates
 */
async function listTemplatesImpl(
  templates: TemplateStore,
): Promise<TemplateResult<readonly TemplateDescriptor[]>> {
  const templateList = Object.values(templates);
  return { kind: 'ok', value: templateList };
}

/**
 * Implementation of recordCompliance
 */
async function recordComplianceImpl(
  sessionId: string,
  pointId: string,
  complianceData: ComplianceSnapshot,
  compliance: ComplianceStore,
): Promise<void> {
  if (!compliance[sessionId]) {
    compliance[sessionId] = [];
  }

  compliance[sessionId].push(complianceData);
}

/**
 * Implementation of getComplianceHistory
 */
async function getComplianceHistoryImpl(
  sessionId: string,
  compliance: ComplianceStore,
): Promise<TemplateResult<readonly ComplianceSnapshot[]>> {
  const history = compliance[sessionId] || [];
  return { kind: 'ok', value: history };
}

/**
 * Validation functions
 */
function validateTemplateDraft(draft: TemplateDraft): TemplateError | null {
  if (!draft.name || draft.name.trim().length === 0) {
    return createTemplateError('invalid_template', 'Template name is required', false);
  }

  if (!draft.points || draft.points.length === 0) {
    return createTemplateError('invalid_template', 'Template must have at least one point', false);
  }

  // Validate each point
  for (const point of draft.points) {
    const pointError = validateTemplatePoint(point);
    if (pointError) {
      return pointError;
    }
  }

  // Check for duplicate point IDs
  const pointIds = new Set<string>();
  for (const point of draft.points) {
    if (pointIds.has(point.id)) {
      return createTemplateError('invalid_point', `Duplicate point ID: ${point.id}`, false);
    }
    pointIds.add(point.id);
  }

  return null;
}

function validateTemplatePoint(point: TemplatePoint): TemplateError | null {
  if (!point.id || point.id.trim().length === 0) {
    return createTemplateError('invalid_point', 'Point ID is required', false);
  }

  if (!point.title || point.title.trim().length === 0) {
    return createTemplateError('invalid_point', 'Point title is required', false);
  }

  if (!point.instructions || point.instructions.trim().length === 0) {
    return createTemplateError('invalid_point', 'Point instructions are required', false);
  }

  if (point.priority < 0) {
    return createTemplateError('invalid_point', 'Point priority must be non-negative', false);
  }

  return null;
}

/**
 * Helper functions
 */
function createTemplateError(
  code: TemplateError['code'],
  message: string,
  recoverable: boolean,
  details?: Record<string, unknown>,
): TemplateError {
  return {
    code,
    message,
    recoverable,
    details,
  };
}

function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
