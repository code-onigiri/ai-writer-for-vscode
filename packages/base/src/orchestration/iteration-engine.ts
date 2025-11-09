export type IterationMode = 'outline' | 'draft';

export type IterationStepType =
  | 'generate'
  | 'critique'
  | 'reflection'
  | 'question'
  | 'regenerate'
  | 'approval';

export interface IterationStep {
  readonly type: IterationStepType;
  readonly payload: Record<string, unknown>;
}

export type IterationStatus = 'active' | 'completed';

export interface IterationHistoryEntry {
  readonly sequence: number;
  readonly cycle: number;
  readonly type: IterationStepType;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface IterationState {
  readonly mode: IterationMode;
  readonly status: IterationStatus;
  readonly cycle: number;
  readonly history: readonly IterationHistoryEntry[];
  readonly nextRequiredStep: IterationStepType | 'completed';
  readonly canApprove: boolean;
}

export type IterationViolationCode =
  | 'unexpected-step'
  | 'approval-not-allowed'
  | 'already-completed';

export interface IterationViolation {
  readonly code: IterationViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface IterationTransitionResult {
  readonly state: IterationState;
  readonly nextRequiredStep: IterationState['nextRequiredStep'];
  readonly violations: readonly IterationViolation[];
}

export interface IterationEngine {
  initializeState(mode: IterationMode): IterationState;
  handleStep(state: IterationState, step: IterationStep): IterationTransitionResult;
}

const emptyHistory = Object.freeze([]) as readonly IterationHistoryEntry[];

const orderedStepsByMode: Record<IterationMode, readonly IterationStepType[]> = {
  outline: Object.freeze(['generate', 'critique', 'reflection', 'question', 'regenerate'] as const),
  draft: Object.freeze(['generate', 'critique', 'reflection', 'regenerate'] as const),
};

export function createIterationEngine(): IterationEngine {
  return {
    initializeState,
    handleStep,
  };
}

function initializeState(mode: IterationMode): IterationState {
  return {
    mode,
    status: 'active',
    cycle: 1,
    history: emptyHistory,
    nextRequiredStep: 'generate',
    canApprove: false,
  };
}

function handleStep(state: IterationState, step: IterationStep): IterationTransitionResult {
  if (state.status === 'completed') {
    return {
      state,
      nextRequiredStep: 'completed',
      violations: [
        createViolation('already-completed', 'Iteration cycle is already completed and cannot accept more steps.'),
      ],
    };
  }

  if (step.type === 'approval') {
    return handleApproval(state, step);
  }

  if (step.type !== state.nextRequiredStep) {
    return {
      state,
      nextRequiredStep: state.nextRequiredStep,
      violations: [
        createViolation('unexpected-step', 'Received an unexpected iteration step.', {
          expected: state.nextRequiredStep,
          received: step.type,
        }),
      ],
    };
  }

  const entry = freezeHistoryEntry(state, step);
  const nextHistory = freezeHistory([...state.history, entry]);

  const nextCycle = step.type === 'regenerate' ? state.cycle + 1 : state.cycle;
  const nextCanApprove = step.type === 'regenerate';
  const nextRequiredStep = nextRequiredStepFor(state.mode, step.type);

  const nextState: IterationState = {
    mode: state.mode,
    status: 'active',
    cycle: nextCycle,
    history: nextHistory,
    nextRequiredStep,
    canApprove: nextCanApprove,
  };

  return {
    state: nextState,
    nextRequiredStep,
    violations: [],
  };
}

function handleApproval(state: IterationState, step: IterationStep): IterationTransitionResult {
  if (!state.canApprove) {
    return {
      state,
      nextRequiredStep: state.nextRequiredStep,
      violations: [
        createViolation('approval-not-allowed', 'Approval cannot be recorded before a regenerate step completes.'),
      ],
    };
  }

  const recordedCycle = Math.max(1, state.cycle - 1);
  const entry = freezeHistoryEntry(state, step, recordedCycle);
  const nextHistory = freezeHistory([...state.history, entry]);
  const nextState: IterationState = {
    mode: state.mode,
    status: 'completed',
    cycle: state.cycle,
    history: nextHistory,
    nextRequiredStep: 'completed',
    canApprove: false,
  };

  return {
    state: nextState,
    nextRequiredStep: 'completed',
    violations: [],
  };
}

function nextRequiredStepFor(
  mode: IterationMode,
  step: Exclude<IterationStepType, 'approval'>,
): IterationStepType | 'completed' {
  const orderedSteps = orderedStepsByMode[mode];
  const stepIndex = orderedSteps.indexOf(step);

  if (stepIndex === -1) {
    return 'completed';
  }

  if (stepIndex === orderedSteps.length - 1) {
    return 'critique';
  }

  return orderedSteps[stepIndex + 1];
}

function freezeHistoryEntry(
  state: IterationState,
  step: IterationStep,
  cycleOverride?: number,
): IterationHistoryEntry {
  const payload = Object.freeze({ ...step.payload });
  return Object.freeze({
    sequence: state.history.length + 1,
    cycle: cycleOverride ?? state.cycle,
    type: step.type,
    payload,
  });
}

function freezeHistory(entries: IterationHistoryEntry[]): readonly IterationHistoryEntry[] {
  return Object.freeze(entries);
}

function createViolation(
  code: IterationViolationCode,
  message: string,
  details?: Record<string, unknown>,
): IterationViolation {
  return Object.freeze({
    code,
    message,
    details: details ? Object.freeze({ ...details }) : undefined,
  });
}
