import { createIterationEngine, type IterationEngine, type IterationStep } from './iteration-engine.js';
import type {
  DraftInput,
  DraftSessionSummary,
  OrchestrationFault,
  OutlineInput,
  OutlineSessionSummary,
  PointEvaluation,
  PointOverride,
  Result,
  SessionSnapshot,
  StepRecord,
} from './types.js';

/**
 * Dependencies for Generation Orchestrator
 */
export interface GenerationOrchestratorDependencies {
  // Will be added as we implement other components
}

/**
 * Generation Orchestrator Options
 */
export interface GenerationOrchestratorOptions {
  dependencies?: Partial<GenerationOrchestratorDependencies>;
}

/**
 * Generation Orchestrator Interface
 */
export interface GenerationOrchestrator {
  startOutlineCycle(input: OutlineInput): Promise<Result<OutlineSessionSummary, OrchestrationFault>>;
  startDraftCycle(input: DraftInput): Promise<Result<DraftSessionSummary, OrchestrationFault>>;
  applyTemplatePoint(
    sessionId: string,
    pointId: string,
    override?: PointOverride,
  ): Promise<Result<PointEvaluation, OrchestrationFault>>;
  getSession(sessionId: string): Promise<Result<SessionSnapshot, OrchestrationFault>>;
  resumeSession(sessionId: string, step: IterationStep): Promise<Result<SessionSnapshot, OrchestrationFault>>;
}

/**
 * Session storage for in-memory session management
 */
interface SessionStore {
  [sessionId: string]: SessionSnapshot;
}

/**
 * Creates a Generation Orchestrator instance
 */
export function createGenerationOrchestrator(
  options: GenerationOrchestratorOptions = {},
): GenerationOrchestrator {
  const iterationEngine = createIterationEngine();
  const sessions: SessionStore = {};

  return {
    startOutlineCycle: async (input: OutlineInput) => {
      return startOutlineCycleImpl(input, iterationEngine, sessions);
    },
    startDraftCycle: async (input: DraftInput) => {
      return startDraftCycleImpl(input, iterationEngine, sessions);
    },
    applyTemplatePoint: async (sessionId: string, pointId: string, override?: PointOverride) => {
      return applyTemplatePointImpl(sessionId, pointId, override, sessions);
    },
    getSession: async (sessionId: string) => {
      return getSessionImpl(sessionId, sessions);
    },
    resumeSession: async (sessionId: string, step: IterationStep) => {
      return resumeSessionImpl(sessionId, step, iterationEngine, sessions);
    },
  };
}

/**
 * Implementation of startOutlineCycle
 */
async function startOutlineCycleImpl(
  input: OutlineInput,
  engine: IterationEngine,
  sessions: SessionStore,
): Promise<Result<OutlineSessionSummary, OrchestrationFault>> {
  // Validate input
  const validationError = validateOutlineInput(input);
  if (validationError) {
    return { kind: 'err', error: validationError };
  }

  // Generate session ID
  const sessionId = generateSessionId();
  const timestamp = new Date().toISOString();

  // Initialize iteration state
  const iterationState = engine.initializeState('outline');

  // Create initial session snapshot
  const session: SessionSnapshot = {
    id: sessionId,
    mode: 'outline',
    personaId: input.personaId,
    templateId: input.templateId,
    steps: [],
    currentState: iterationState,
    outputs: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Store session
  sessions[sessionId] = session;

  // Create summary (for now, return empty outline)
  const summary: OutlineSessionSummary = {
    sessionId,
    outline: {
      id: generateDocumentId(),
      sections: [],
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
      },
    },
    auditTrail: [],
  };

  return { kind: 'ok', value: summary };
}

/**
 * Implementation of startDraftCycle
 */
async function startDraftCycleImpl(
  input: DraftInput,
  engine: IterationEngine,
  sessions: SessionStore,
): Promise<Result<DraftSessionSummary, OrchestrationFault>> {
  // Validate input
  const validationError = validateDraftInput(input);
  if (validationError) {
    return { kind: 'err', error: validationError };
  }

  // Generate session ID
  const sessionId = generateSessionId();
  const timestamp = new Date().toISOString();

  // Initialize iteration state
  const iterationState = engine.initializeState('draft');

  // Create initial session snapshot
  const session: SessionSnapshot = {
    id: sessionId,
    mode: 'draft',
    personaId: input.personaId,
    templateId: input.templateId,
    steps: [],
    currentState: iterationState,
    outputs: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Store session
  sessions[sessionId] = session;

  // Create summary (for now, return empty draft)
  const summary: DraftSessionSummary = {
    sessionId,
    draft: {
      id: generateDocumentId(),
      outlineId: input.outlineId,
      content: '',
      sections: [],
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
        approved: false,
      },
    },
    auditTrail: [],
  };

  return { kind: 'ok', value: summary };
}

/**
 * Implementation of applyTemplatePoint
 */
async function applyTemplatePointImpl(
  sessionId: string,
  pointId: string,
  override: PointOverride | undefined,
  sessions: SessionStore,
): Promise<Result<PointEvaluation, OrchestrationFault>> {
  const session = sessions[sessionId];
  if (!session) {
    return {
      kind: 'err',
      error: createFault('invalid_state', `Session ${sessionId} not found`, false),
    };
  }

  // For now, return a placeholder evaluation
  const evaluation: PointEvaluation = {
    pointId,
    compliant: true,
    notes: 'Template point evaluation not yet implemented',
    evidence: '',
  };

  return { kind: 'ok', value: evaluation };
}

/**
 * Implementation of getSession
 */
async function getSessionImpl(
  sessionId: string,
  sessions: SessionStore,
): Promise<Result<SessionSnapshot, OrchestrationFault>> {
  const session = sessions[sessionId];
  if (!session) {
    return {
      kind: 'err',
      error: createFault('invalid_state', `Session ${sessionId} not found`, false),
    };
  }

  return { kind: 'ok', value: session };
}

/**
 * Implementation of resumeSession
 */
async function resumeSessionImpl(
  sessionId: string,
  step: IterationStep,
  engine: IterationEngine,
  sessions: SessionStore,
): Promise<Result<SessionSnapshot, OrchestrationFault>> {
  const session = sessions[sessionId];
  if (!session) {
    return {
      kind: 'err',
      error: createFault('invalid_state', `Session ${sessionId} not found`, false),
    };
  }

  // Handle step with iteration engine
  const transitionResult = engine.handleStep(session.currentState, step);

  if (transitionResult.violations.length > 0) {
    const violation = transitionResult.violations[0];
    return {
      kind: 'err',
      error: createFault(
        'invalid_state',
        violation.message,
        true,
        violation.details as Record<string, unknown>,
      ),
    };
  }

  // Create step record
  const stepRecord: StepRecord = {
    stepId: generateStepId(),
    sessionId,
    type: step.type,
    input: step.payload,
    output: {},
    timestamp: new Date().toISOString(),
    durationMs: 0,
  };

  // Update session
  const updatedSession: SessionSnapshot = {
    ...session,
    currentState: transitionResult.state,
    steps: [...session.steps, stepRecord],
    updatedAt: new Date().toISOString(),
  };

  sessions[sessionId] = updatedSession;

  return { kind: 'ok', value: updatedSession };
}

/**
 * Validation functions
 */
function validateOutlineInput(input: OutlineInput): OrchestrationFault | null {
  if (!input.idea || input.idea.trim().length === 0) {
    return createFault('validation_error', 'Idea is required and cannot be empty', false);
  }

  if (input.historyDepth < 0) {
    return createFault('validation_error', 'History depth must be non-negative', false);
  }

  return null;
}

function validateDraftInput(input: DraftInput): OrchestrationFault | null {
  if (!input.outlineId || input.outlineId.trim().length === 0) {
    return createFault('validation_error', 'Outline ID is required and cannot be empty', false);
  }

  return null;
}

/**
 * Helper functions
 */
function createFault(
  code: OrchestrationFault['code'],
  message: string,
  recoverable: boolean,
  details?: Record<string, unknown>,
): OrchestrationFault {
  return {
    code,
    message,
    recoverable,
    details,
  };
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
