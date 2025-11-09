export type DebugSink = (entry: DebugEntry) => void | Promise<void>;

export interface DebugTracerOptions {
  component: string;
  sink?: DebugSink;
  clock?: () => Date;
}

export interface DebugEntry {
  component: string;
  event: string;
  data?: Record<string, unknown>;
  timestamp: string;
  level: 'debug';
}

export interface DebugTracer {
  trace(event: string, data?: Record<string, unknown>): Promise<void>;
}

export function createDebugTracer(options: DebugTracerOptions): DebugTracer {
  const sink = options.sink ?? defaultSink;
  const clock = options.clock ?? (() => new Date());

  async function trace(event: string, data?: Record<string, unknown>): Promise<void> {
    const entry: DebugEntry = {
      component: options.component,
      event,
      data,
      timestamp: clock().toISOString(),
      level: 'debug',
    };

    await sink(entry);
  }

  return { trace };
}

function defaultSink(entry: DebugEntry): void {
  // eslint-disable-next-line no-console
  console.debug(`[${entry.timestamp}] [${entry.component}] ${entry.event}`, entry.data ?? '');
}
