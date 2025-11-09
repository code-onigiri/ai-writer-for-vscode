/**
 * Persona definition
 */
export interface PersonaDefinition {
  readonly id: string;
  readonly name: string;
  readonly tone: string;
  readonly audience: string;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly metadata: PersonaMetadata;
}

/**
 * Persona metadata
 */
export interface PersonaMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly source?: string; // Where the persona was extracted from (e.g., "Q&A session")
}

/**
 * Persona draft for creation
 */
export interface PersonaDraft {
  readonly name: string;
  readonly tone: string;
  readonly audience: string;
  readonly toggles?: Readonly<Record<string, boolean>>;
  readonly source?: string;
}

/**
 * Persona error codes
 */
export type PersonaErrorCode =
  | 'persona_not_found'
  | 'invalid_persona'
  | 'duplicate_persona'
  | 'template_not_found'
  | 'incompatible_persona'
  | 'storage_error';

/**
 * Persona error
 */
export interface PersonaError {
  readonly code: PersonaErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type for persona operations
 */
export type PersonaResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: PersonaError };

/**
 * Persona application history entry
 */
export interface PersonaApplicationHistory {
  readonly sessionId: string;
  readonly personaId: string;
  readonly templateId?: string;
  readonly appliedAt: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}
