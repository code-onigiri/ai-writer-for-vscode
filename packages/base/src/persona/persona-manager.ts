import type { TemplateDescriptor, TemplateRegistry } from '../template/index.js';
import type {
  PersonaApplicationHistory,
  PersonaDefinition,
  PersonaDraft,
  PersonaError,
  PersonaResult,
} from './types.js';

/**
 * Dependencies for Persona Manager
 */
export interface PersonaManagerDependencies {
  templateRegistry?: TemplateRegistry;
}

/**
 * Persona Manager Options
 */
export interface PersonaManagerOptions {
  dependencies?: PersonaManagerDependencies;
}

/**
 * Persona Manager interface
 */
export interface PersonaManager {
  upsertPersona(persona: PersonaDraft): Promise<PersonaResult<PersonaDefinition>>;
  getPersona(id: string): Promise<PersonaResult<PersonaDefinition>>;
  updatePersona(id: string, updates: Partial<PersonaDraft>): Promise<PersonaResult<PersonaDefinition>>;
  deletePersona(id: string): Promise<PersonaResult<void>>;
  listPersonas(): Promise<PersonaResult<readonly PersonaDefinition[]>>;
  applyPersona(templateId: string, personaId: string): Promise<PersonaResult<TemplateDescriptor>>;
  validatePersonaTemplateCompatibility(personaId: string, templateId: string): Promise<PersonaResult<ValidationResult>>;
  recordApplication(history: PersonaApplicationHistory): Promise<void>;
  getApplicationHistory(sessionId: string): Promise<PersonaResult<readonly PersonaApplicationHistory[]>>;
}

/**
 * Validation result for persona-template compatibility
 */
export interface ValidationResult {
  compatible: boolean;
  warnings: string[];
  suggestions: string[];
}

/**
 * Persona storage for in-memory persistence
 */
type PersonaStore = Record<string, PersonaDefinition>;

/**
 * Application history storage
 */
type ApplicationHistoryStore = Record<string, PersonaApplicationHistory[]>;

/**
 * Creates a Persona Manager instance
 */
export function createPersonaManager(options: PersonaManagerOptions = {}): PersonaManager {
  const personas: PersonaStore = {};
  const applicationHistory: ApplicationHistoryStore = {};
  const templateRegistry = options.dependencies?.templateRegistry;

  return {
    upsertPersona: async (persona: PersonaDraft) => {
      return upsertPersonaImpl(persona, personas);
    },
    getPersona: async (id: string) => {
      return getPersonaImpl(id, personas);
    },
    updatePersona: async (id: string, updates: Partial<PersonaDraft>) => {
      return updatePersonaImpl(id, updates, personas);
    },
    deletePersona: async (id: string) => {
      return deletePersonaImpl(id, personas);
    },
    listPersonas: async () => {
      return listPersonasImpl(personas);
    },
    applyPersona: async (templateId: string, personaId: string) => {
      return applyPersonaImpl(templateId, personaId, personas, templateRegistry);
    },
    validatePersonaTemplateCompatibility: async (personaId: string, templateId: string) => {
      return validatePersonaTemplateCompatibilityImpl(personaId, templateId, personas, templateRegistry);
    },
    recordApplication: async (history: PersonaApplicationHistory) => {
      return recordApplicationImpl(history, applicationHistory);
    },
    getApplicationHistory: async (sessionId: string) => {
      return getApplicationHistoryImpl(sessionId, applicationHistory);
    },
  };
}

/**
 * Implementation of upsertPersona
 */
async function upsertPersonaImpl(
  draft: PersonaDraft,
  personas: PersonaStore,
): Promise<PersonaResult<PersonaDefinition>> {
  // Validate input
  const validationError = validatePersonaDraft(draft);
  if (validationError) {
    return { kind: 'err', error: validationError };
  }

  // Check for existing persona with same name
  const existingPersona = Object.values(personas).find((p) => p.name === draft.name);

  if (existingPersona) {
    // Update existing persona
    const timestamp = new Date().toISOString();
    const updated: PersonaDefinition = {
      ...existingPersona,
      tone: draft.tone,
      audience: draft.audience,
      toggles: draft.toggles ? { ...draft.toggles } : existingPersona.toggles,
      metadata: {
        ...existingPersona.metadata,
        updatedAt: timestamp,
        source: draft.source || existingPersona.metadata.source,
      },
    };

    personas[existingPersona.id] = updated;
    return { kind: 'ok', value: updated };
  }

  // Create new persona
  const timestamp = new Date().toISOString();
  const persona: PersonaDefinition = {
    id: generatePersonaId(),
    name: draft.name,
    tone: draft.tone,
    audience: draft.audience,
    toggles: draft.toggles ? { ...draft.toggles } : {},
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      source: draft.source,
    },
  };

  personas[persona.id] = persona;
  return { kind: 'ok', value: persona };
}

/**
 * Implementation of getPersona
 */
async function getPersonaImpl(
  id: string,
  personas: PersonaStore,
): Promise<PersonaResult<PersonaDefinition>> {
  const persona = personas[id];
  if (!persona) {
    return {
      kind: 'err',
      error: createPersonaError('persona_not_found', `Persona with ID "${id}" not found`, false),
    };
  }

  return { kind: 'ok', value: persona };
}

/**
 * Implementation of updatePersona
 */
async function updatePersonaImpl(
  id: string,
  updates: Partial<PersonaDraft>,
  personas: PersonaStore,
): Promise<PersonaResult<PersonaDefinition>> {
  const persona = personas[id];
  if (!persona) {
    return {
      kind: 'err',
      error: createPersonaError('persona_not_found', `Persona with ID "${id}" not found`, false),
    };
  }

  // Check for duplicate names if name is being updated
  if (updates.name && updates.name !== persona.name) {
    const existingPersona = Object.values(personas).find(
      (p) => p.id !== id && p.name === updates.name,
    );
    if (existingPersona) {
      return {
        kind: 'err',
        error: createPersonaError(
          'duplicate_persona',
          `Persona with name "${updates.name}" already exists`,
          false,
        ),
      };
    }
  }

  // Update persona
  const timestamp = new Date().toISOString();
  const updated: PersonaDefinition = {
    ...persona,
    name: updates.name ?? persona.name,
    tone: updates.tone ?? persona.tone,
    audience: updates.audience ?? persona.audience,
    toggles: updates.toggles ? { ...updates.toggles } : persona.toggles,
    metadata: {
      ...persona.metadata,
      updatedAt: timestamp,
      source: updates.source ?? persona.metadata.source,
    },
  };

  personas[id] = updated;
  return { kind: 'ok', value: updated };
}

/**
 * Implementation of deletePersona
 */
async function deletePersonaImpl(id: string, personas: PersonaStore): Promise<PersonaResult<void>> {
  const persona = personas[id];
  if (!persona) {
    return {
      kind: 'err',
      error: createPersonaError('persona_not_found', `Persona with ID "${id}" not found`, false),
    };
  }

  delete personas[id];
  return { kind: 'ok', value: undefined };
}

/**
 * Implementation of listPersonas
 */
async function listPersonasImpl(
  personas: PersonaStore,
): Promise<PersonaResult<readonly PersonaDefinition[]>> {
  const personaList = Object.values(personas);
  return { kind: 'ok', value: personaList };
}

/**
 * Implementation of applyPersona
 */
async function applyPersonaImpl(
  templateId: string,
  personaId: string,
  personas: PersonaStore,
  templateRegistry: TemplateRegistry | undefined,
): Promise<PersonaResult<TemplateDescriptor>> {
  // Check if persona exists
  const persona = personas[personaId];
  if (!persona) {
    return {
      kind: 'err',
      error: createPersonaError('persona_not_found', `Persona with ID "${personaId}" not found`, false),
    };
  }

  // If no template registry is provided, we can't apply persona to template
  if (!templateRegistry) {
    return {
      kind: 'err',
      error: createPersonaError(
        'template_not_found',
        'Template registry not available',
        false,
      ),
    };
  }

  // Load template
  const templateResult = await templateRegistry.loadTemplate(templateId);
  if (templateResult.kind === 'err') {
    return {
      kind: 'err',
      error: createPersonaError(
        'template_not_found',
        `Template with ID "${templateId}" not found`,
        false,
      ),
    };
  }

  const template = templateResult.value;

  // Apply persona hints to template metadata
  const updatedTemplate: TemplateDescriptor = {
    ...template,
    metadata: {
      ...template.metadata,
      personaHints: [
        ...template.metadata.personaHints,
        `tone:${persona.tone}`,
        `audience:${persona.audience}`,
      ],
      updatedAt: new Date().toISOString(),
    },
  };

  // Note: In a real implementation, we would update the template in the registry
  // For now, we just return the modified template
  return { kind: 'ok', value: updatedTemplate };
}

/**
 * Implementation of recordApplication
 */
async function recordApplicationImpl(
  history: PersonaApplicationHistory,
  applicationHistory: ApplicationHistoryStore,
): Promise<void> {
  if (!applicationHistory[history.sessionId]) {
    applicationHistory[history.sessionId] = [];
  }

  applicationHistory[history.sessionId].push(history);
}

/**
 * Implementation of getApplicationHistory
 */
async function getApplicationHistoryImpl(
  sessionId: string,
  applicationHistory: ApplicationHistoryStore,
): Promise<PersonaResult<readonly PersonaApplicationHistory[]>> {
  const history = applicationHistory[sessionId] || [];
  return { kind: 'ok', value: history };
}

/**
 * Validation functions
 */
function validatePersonaDraft(draft: PersonaDraft): PersonaError | null {
  if (!draft.name || draft.name.trim().length === 0) {
    return createPersonaError('invalid_persona', 'Persona name is required', false);
  }

  if (!draft.tone || draft.tone.trim().length === 0) {
    return createPersonaError('invalid_persona', 'Persona tone is required', false);
  }

  if (!draft.audience || draft.audience.trim().length === 0) {
    return createPersonaError('invalid_persona', 'Persona audience is required', false);
  }

  return null;
}

/**
 * Implementation of validatePersonaTemplateCompatibility
 */
async function validatePersonaTemplateCompatibilityImpl(
  personaId: string,
  templateId: string,
  personas: PersonaStore,
  templateRegistry: TemplateRegistry | undefined,
): Promise<PersonaResult<ValidationResult>> {
  // Check if persona exists
  const persona = personas[personaId];
  if (!persona) {
    return {
      kind: 'err',
      error: createPersonaError('persona_not_found', `Persona with ID "${personaId}" not found`, false),
    };
  }

  // If no template registry, we can't validate
  if (!templateRegistry) {
    return {
      kind: 'ok',
      value: {
        compatible: true,
        warnings: ['Template registry not available for validation'],
        suggestions: [],
      },
    };
  }

  // Load template
  const templateResult = await templateRegistry.loadTemplate(templateId);
  if (templateResult.kind === 'err') {
    return {
      kind: 'err',
      error: createPersonaError(
        'template_not_found',
        `Template with ID "${templateId}" not found`,
        false,
      ),
    };
  }

  const template = templateResult.value;
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if persona hints are compatible
  const personaHints = template.metadata.personaHints || [];
  
  // Check for tone compatibility
  const toneHints = personaHints.filter(h => h.startsWith('tone:'));
  if (toneHints.length > 0) {
    const expectedTones = toneHints.map(h => h.substring(5));
    if (!expectedTones.includes(persona.tone)) {
      warnings.push(`Persona tone "${persona.tone}" may not match template expectations: ${expectedTones.join(', ')}`);
      suggestions.push(`Consider adjusting persona tone to match template requirements`);
    }
  }

  // Check for audience compatibility
  const audienceHints = personaHints.filter(h => h.startsWith('audience:'));
  if (audienceHints.length > 0) {
    const expectedAudiences = audienceHints.map(h => h.substring(9));
    if (!expectedAudiences.includes(persona.audience)) {
      warnings.push(`Persona audience "${persona.audience}" may not match template expectations: ${expectedAudiences.join(', ')}`);
      suggestions.push(`Consider adjusting persona audience to match template requirements`);
    }
  }

  // Check toggles compatibility
  const toggleHints = personaHints.filter(h => h.startsWith('toggle:'));
  const requiredToggles = toggleHints.map(h => h.substring(7));
  const missingToggles = requiredToggles.filter(t => !(t in (persona.toggles || {})));
  
  if (missingToggles.length > 0) {
    warnings.push(`Persona missing toggles expected by template: ${missingToggles.join(', ')}`);
    suggestions.push(`Add missing toggles: ${missingToggles.join(', ')}`);
  }

  return {
    kind: 'ok',
    value: {
      compatible: warnings.length === 0,
      warnings,
      suggestions,
    },
  };
}

/**
 * Helper functions
 */
function createPersonaError(
  code: PersonaError['code'],
  message: string,
  recoverable: boolean,
  details?: Record<string, unknown>,
): PersonaError {
  return {
    code,
    message,
    recoverable,
    details,
  };
}

function generatePersonaId(): string {
  return `persona-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
