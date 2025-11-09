import { describe, expect, it } from 'vitest';

import {
  createIterationEngine,
  type IterationMode,
  type IterationStep,
} from '@ai-writer/base/orchestration/iteration-engine';

describe('IterationEngine', () => {
  const step = (type: IterationStep['type'], payload: Record<string, unknown> = {}) => ({
    type,
    payload,
  });

  it('initializes state with the correct defaults for each mode', () => {
    const engine = createIterationEngine();

    const outlineState = engine.initializeState('outline');
    expect(outlineState.mode).toBe('outline');
    expect(outlineState.status).toBe('active');
    expect(outlineState.history).toHaveLength(0);
    expect(outlineState.nextRequiredStep).toBe('generate');
    expect(outlineState.cycle).toBe(1);
    expect(outlineState.canApprove).toBe(false);

    const draftState = engine.initializeState('draft');
    expect(draftState.mode).toBe('draft');
    expect(draftState.status).toBe('active');
    expect(draftState.history).toHaveLength(0);
    expect(draftState.nextRequiredStep).toBe('generate');
    expect(draftState.cycle).toBe(1);
    expect(draftState.canApprove).toBe(false);
  });

  it('enforces outline iteration order and completes after approval', () => {
    const engine = createIterationEngine();
    const initial = engine.initializeState('outline');

    const generate = engine.handleStep(initial, step('generate', { outline: 'v1' }));
    expect(generate.violations).toHaveLength(0);
    expect(generate.nextRequiredStep).toBe('critique');
    expect(initial.history).toHaveLength(0);
    expect(generate.state.history).toHaveLength(1);
    expect(Object.isFrozen(generate.state.history)).toBe(true);

    const critique = engine.handleStep(generate.state, step('critique', { gaps: ['tone'] }));
    expect(critique.violations).toHaveLength(0);
    expect(critique.nextRequiredStep).toBe('reflection');

    const reflection = engine.handleStep(critique.state, step('reflection', { plan: 'tighten intro' }));
    expect(reflection.violations).toHaveLength(0);
    expect(reflection.nextRequiredStep).toBe('question');

    const question = engine.handleStep(reflection.state, step('question', { items: ['Who is the reader?'] }));
    expect(question.violations).toHaveLength(0);
    expect(question.nextRequiredStep).toBe('regenerate');

    const regenerate = engine.handleStep(question.state, step('regenerate', { outline: 'v2' }));
    expect(regenerate.violations).toHaveLength(0);
    expect(regenerate.state.canApprove).toBe(true);
    expect(regenerate.nextRequiredStep).toBe('critique');

    const approval = engine.handleStep(regenerate.state, step('approval', { approver: 'planner' }));
    expect(approval.violations).toHaveLength(0);
    expect(approval.state.status).toBe('completed');
    expect(approval.nextRequiredStep).toBe('completed');
    expect(approval.state.history.map((entry) => entry.type)).toEqual([
      'generate',
      'critique',
      'reflection',
      'question',
      'regenerate',
      'approval',
    ]);
    const lastRecord = approval.state.history.at(-1);
    expect(lastRecord?.sequence).toBe(6);
    expect(lastRecord?.cycle).toBe(1);
  });

  it('rejects unexpected steps and keeps state unchanged', () => {
    const engine = createIterationEngine();
    const initial = engine.initializeState('outline');

    const result = engine.handleStep(initial, step('critique'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe('unexpected-step');
    expect(result.nextRequiredStep).toBe('generate');
    expect(result.state).toBe(initial);
  });

  it('omits the question step for draft mode and forbids approval too early', () => {
    const engine = createIterationEngine();
    const initial = engine.initializeState('draft');

    const generate = engine.handleStep(initial, step('generate'));
    const critique = engine.handleStep(generate.state, step('critique'));
    const reflection = engine.handleStep(critique.state, step('reflection'));

    const prematureApproval = engine.handleStep(reflection.state, step('approval'));
    expect(prematureApproval.violations).toHaveLength(1);
    expect(prematureApproval.violations[0]?.code).toBe('approval-not-allowed');
    expect(prematureApproval.state).toBe(reflection.state);

    const invalidQuestion = engine.handleStep(reflection.state, step('question'));
    expect(invalidQuestion.violations).toHaveLength(1);
    expect(invalidQuestion.violations[0]?.code).toBe('unexpected-step');
    expect(invalidQuestion.state).toBe(reflection.state);

    const regenerate = engine.handleStep(reflection.state, step('regenerate'));
    expect(regenerate.violations).toHaveLength(0);
    expect(regenerate.state.canApprove).toBe(true);
    expect(regenerate.nextRequiredStep).toBe('critique');

    const approved = engine.handleStep(regenerate.state, step('approval'));
    expect(approved.violations).toHaveLength(0);
    expect(approved.state.status).toBe('completed');
    expect(approved.nextRequiredStep).toBe('completed');
  });

  it('blocks any further steps once the iteration is completed', () => {
    const engine = createIterationEngine();
    const doneState = completeCycle(engine, 'draft');

    const afterCompletion = engine.handleStep(doneState, step('critique'));
    expect(afterCompletion.violations).toHaveLength(1);
    expect(afterCompletion.violations[0]?.code).toBe('already-completed');
    expect(afterCompletion.nextRequiredStep).toBe('completed');
    expect(afterCompletion.state).toBe(doneState);
  });

  it('increments the cycle after each regenerate step', () => {
    const engine = createIterationEngine();
    const outline = engine.initializeState('outline');

    const generate = engine.handleStep(outline, step('generate'));
    const critique = engine.handleStep(generate.state, step('critique'));
    const reflection = engine.handleStep(critique.state, step('reflection'));
    const question = engine.handleStep(reflection.state, step('question'));
    const regenerate = engine.handleStep(question.state, step('regenerate'));
    expect(regenerate.state.cycle).toBe(2);

    const secondCritique = engine.handleStep(regenerate.state, step('critique'));
    expect(secondCritique.state.cycle).toBe(2);
    expect(secondCritique.violations).toHaveLength(0);
    expect(secondCritique.state.history.at(-1)?.cycle).toBe(2);
    expect(secondCritique.state.canApprove).toBe(false);
  });

  function completeCycle(modeEngine: ReturnType<typeof createIterationEngine>, mode: IterationMode) {
    let state = modeEngine.initializeState(mode);
    state = modeEngine.handleStep(state, step('generate')).state;
    state = modeEngine.handleStep(state, step('critique')).state;
    state = modeEngine.handleStep(state, step('reflection')).state;

    if (mode === 'outline') {
      state = modeEngine.handleStep(state, step('question')).state;
    }

    state = modeEngine.handleStep(state, step('regenerate')).state;
    return modeEngine.handleStep(state, step('approval')).state;
  }
});
