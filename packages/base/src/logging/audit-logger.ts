import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

export interface AuditLoggerOptions {
  directory: string;
  clock?: () => Date;
}

export interface AuditLogger {
  record(eventType: string, payload: Record<string, unknown>): Promise<void>;
}

export function createAuditLogger(options: AuditLoggerOptions): AuditLogger {
  const clock = options.clock ?? (() => new Date());

  async function record(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const timestamp = clock();
    const isoTimestamp = timestamp.toISOString();
    const dayKey = isoTimestamp.slice(0, 10);
    const entry = {
      type: eventType,
      payload,
      timestamp: isoTimestamp,
    } satisfies Record<string, unknown>;

    await mkdir(options.directory, { recursive: true });
    const filePath = path.join(options.directory, `${dayKey}.jsonl`);
    await appendFile(filePath, `${JSON.stringify(entry)}\n`);
  }

  return {
    record,
  };
}
