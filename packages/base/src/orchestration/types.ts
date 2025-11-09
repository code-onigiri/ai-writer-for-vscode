import type { IterationState, IterationStep } from './iteration-engine.js';

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

/**
 * Input for starting an outline generation cycle
 */
export interface OutlineInput {
  readonly idea: string;
  readonly personaId?: string;
  readonly templateId?: string;
  readonly historyDepth: number;
}

/**
 * Input for starting a draft generation cycle
 */
export interface DraftInput {
  readonly outlineId: string;
  readonly personaId?: string;
  readonly templateId?: string;
}

/**
 * Outline document structure
 */
export interface OutlineDocument {
  readonly id: string;
  readonly sections: readonly OutlineSection[];
  readonly metadata: OutlineMetadata;
}

export interface OutlineSection {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly subsections: readonly OutlineSection[];
}

export interface OutlineMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

/**
 * Draft document structure
 */
export interface DraftDocument {
  readonly id: string;
  readonly outlineId: string;
  readonly content: string;
  readonly sections: readonly DraftSection[];
  readonly metadata: DraftMetadata;
}

export interface DraftSection {
  readonly id: string;
  readonly outlineRefId: string;
  readonly content: string;
  readonly wordCount: number;
}

export interface DraftMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly approved: boolean;
}

/**
 * Step record for audit trail
 */
export interface StepRecord {
  readonly stepId: string;
  readonly sessionId: string;
  readonly type: IterationStep['type'];
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
  readonly timestamp: string;
  readonly durationMs: number;
}

/**
 * Session summary for outline generation
 */
export interface OutlineSessionSummary {
  readonly sessionId: string;
  readonly outline: OutlineDocument;
  readonly auditTrail: readonly StepRecord[];
}

/**
 * Session summary for draft generation
 */
export interface DraftSessionSummary {
  readonly sessionId: string;
  readonly draft: DraftDocument;
  readonly auditTrail: readonly StepRecord[];
}

/**
 * Orchestration fault codes
 */
export type OrchestrationFaultCode =
  | 'invalid_state'
  | 'provider_failure'
  | 'storage_error'
  | 'template_error'
  | 'persona_error'
  | 'validation_error';

/**
 * Orchestration error
 */
export interface OrchestrationFault {
  readonly code: OrchestrationFaultCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly details?: Record<string, unknown>;
}

/**
 * Point override for template customization
 */
export interface PointOverride {
  readonly instructions?: string;
  readonly priority?: number;
}

/**
 * Point evaluation result
 */
export interface PointEvaluation {
  readonly pointId: string;
  readonly compliant: boolean;
  readonly notes: string;
  readonly evidence: string;
}

/**
 * Session snapshot for persistence
 */
export interface SessionSnapshot {
  readonly id: string;
  readonly mode: 'outline' | 'draft';
  readonly personaId?: string;
  readonly templateId?: string;
  readonly steps: readonly StepRecord[];
  readonly currentState: IterationState;
  readonly outputs: {
    readonly outline?: OutlineDocument;
    readonly draft?: DraftDocument;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}
