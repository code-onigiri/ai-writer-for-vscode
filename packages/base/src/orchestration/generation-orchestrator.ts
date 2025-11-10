import { createIterationEngine, type IterationEngine, type IterationStep } from './iteration-engine.js';

import type { AISDKHub } from '../provider/aisdk-hub.js';
import type { StorageGateway } from '../storage/storage-gateway.js';
import type { TemplateRegistry } from '../template/template-registry.js';
import type { PersonaManager } from '../persona/persona-manager.js';
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
  aisdkHub?: AISDKHub;
  storageGateway?: StorageGateway;
  templateRegistry?: TemplateRegistry;
  personaManager?: PersonaManager;
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
type SessionStore = Record<string, SessionSnapshot>;

/**
 * Creates a Generation Orchestrator instance
 */
export function createGenerationOrchestrator(
  options: GenerationOrchestratorOptions = {},
): GenerationOrchestrator {
  const iterationEngine = createIterationEngine();
  const sessions: SessionStore = {};
  const deps = options.dependencies ?? {};

  return {
    startOutlineCycle: async (input: OutlineInput) => {
      return startOutlineCycleImpl(input, iterationEngine, sessions, deps);
    },
    startDraftCycle: async (input: DraftInput) => {
      return startDraftCycleImpl(input, iterationEngine, sessions, deps);
    },
    applyTemplatePoint: async (sessionId: string, pointId: string, override?: PointOverride) => {
      return applyTemplatePointImpl(sessionId, pointId, override, sessions, deps);
    },
    getSession: async (sessionId: string) => {
      return getSessionImpl(sessionId, sessions);
    },
    resumeSession: async (sessionId: string, step: IterationStep) => {
      return resumeSessionImpl(sessionId, step, iterationEngine, sessions, deps);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: Partial<GenerationOrchestratorDependencies>,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: Partial<GenerationOrchestratorDependencies>,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: Partial<GenerationOrchestratorDependencies>,
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
  deps: Partial<GenerationOrchestratorDependencies>,
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

  const startTime = Date.now();
  let output: Record<string, unknown> = {};

  // Execute AI generation if AISDK Hub is available and step requires generation
  if (deps.aisdkHub && (step.type === 'generate' || step.type === 'critique' || step.type === 'reflection' || step.type === 'question')) {
    // Build template context
    const templateContext = await buildTemplateContext(session, deps);
    
    // Determine provider mode based on step type
    const mode = step.type as 'outline' | 'draft' | 'critique' | 'reflection' | 'question';
    
    // Execute with fallback if available
    const providerRequest = {
      key: 'openai' as const,  // Default to OpenAI, can be made configurable
      payload: {
        prompt: typeof step.payload === 'string' ? step.payload : JSON.stringify(step.payload),
        mode,
      },
      templateContext,
    };

    const result = deps.aisdkHub.executeWithFallback
      ? await deps.aisdkHub.executeWithFallback(providerRequest)
      : await deps.aisdkHub.execute(providerRequest);

    if (result.kind === 'ok') {
      output = {
        content: result.value.content,
        usage: result.value.usage,
        finishReason: result.value.finishReason,
      };
    } else {
      // Log error but don't fail the session
      output = {
        error: result.error.message,
        errorCode: result.error.code,
      };
    }
  }

  // Create step record
  const stepRecord: StepRecord = {
    stepId: generateStepId(),
    sessionId,
    type: step.type,
    input: step.payload,
    output,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };

  // Update session
  const updatedSession: SessionSnapshot = {
    ...session,
    currentState: transitionResult.state,
    steps: [...session.steps, stepRecord],
    outputs: {
      ...session.outputs,
      [step.type]: output,
    },
    updatedAt: new Date().toISOString(),
  };

  sessions[sessionId] = updatedSession;

  // Save session to storage if available
  if (deps.storageGateway) {
    await deps.storageGateway.saveSession(updatedSession);
  }

  return { kind: 'ok', value: updatedSession };
}

/**
 * Build template context for AI generation
 */
async function buildTemplateContext(
  session: SessionSnapshot,
  deps: Partial<GenerationOrchestratorDependencies>,
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {};

  // Add persona context if available
  if (session.personaId && deps.personaManager) {
    const personaResult = await deps.personaManager.getPersona(session.personaId);
    if (personaResult.kind === 'ok') {
      context.persona = {
        id: personaResult.value.id,
        tone: personaResult.value.tone,
        audience: personaResult.value.audience,
      };
    }
  }

  // Add template context if available
  if (session.templateId && deps.templateRegistry) {
    const templateResult = await deps.templateRegistry.loadTemplate(session.templateId);
    if (templateResult.kind === 'ok') {
      context.template = {
        id: templateResult.value.id,
        name: templateResult.value.name,
        points: templateResult.value.points?.map(p => ({
          pointId: p.id,
          instructions: p.instructions,
          priority: p.priority,
        })) ?? [],
      };
    }
  }

  return context;
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
