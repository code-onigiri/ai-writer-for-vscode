/**
 * Template point definition
 */
export interface TemplatePoint {
  readonly id: string;
  readonly title: string;
  readonly instructions: string;
  readonly priority: number;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  readonly personaHints: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Template descriptor
 */
export interface TemplateDescriptor {
  readonly id: string;
  readonly name: string;
  readonly points: readonly TemplatePoint[];
  readonly metadata: TemplateMetadata;
}

/**
 * Template draft for creation
 */
export interface TemplateDraft {
  readonly name: string;
  readonly personaHints?: readonly string[];
  readonly points: readonly TemplatePoint[];
}

/**
 * Compliance snapshot for a template point
 */
export interface ComplianceSnapshot {
  readonly pointId: string;
  readonly adhered: boolean;
  readonly notes: string;
  readonly evidence: string;
  readonly timestamp: string;
}

/**
 * Template error codes
 */
export type TemplateErrorCode =
  | 'template_not_found'
  | 'invalid_template'
  | 'duplicate_template'
  | 'invalid_point'
  | 'storage_error';

/**
 * Template error
 */
export interface TemplateError {
  readonly code: TemplateErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type for template operations
 */
export type TemplateResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: TemplateError };
