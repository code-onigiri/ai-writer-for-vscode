import { describe, expect, it, vi } from 'vitest';

import { createDebugTracer } from '@ai-writer/base/logging';

describe('DebugTracer', () => {
  it('forwards trace events to the configured sink', async () => {
    const sink = vi.fn();
    const tracer = createDebugTracer({
      component: 'iteration-engine',
      sink,
      clock: () => new Date('2025-02-02T10:00:00.000Z'),
    });

  await tracer.trace('state-transition', { from: 'generate', to: 'critique' });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({
      component: 'iteration-engine',
      event: 'state-transition',
      data: { from: 'generate', to: 'critique' },
      timestamp: '2025-02-02T10:00:00.000Z',
      level: 'debug',
    });
  });
});
