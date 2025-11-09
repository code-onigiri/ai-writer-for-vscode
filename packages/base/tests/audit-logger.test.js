import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAuditLogger } from '@ai-writer/base/logging';
describe('AuditLogger', () => {
    it('writes structured entries to JSON lines files', async () => {
        const tmp = await mkdtemp(path.join(os.tmpdir(), 'ai-writer-audit-'));
        const logger = createAuditLogger({
            directory: tmp,
            clock: () => new Date('2025-01-01T00:00:00.000Z'),
        });
        await logger.record('provider.invocation', { provider: 'openai' });
        await logger.record('provider.success', { provider: 'openai', durationMs: 42 });
        const logFile = path.join(tmp, '2025-01-01.jsonl');
        const contents = await readFile(logFile, 'utf8');
        const entries = contents
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        expect(entries).toHaveLength(2);
        expect(entries[0]).toMatchObject({
            type: 'provider.invocation',
            payload: { provider: 'openai' },
            timestamp: '2025-01-01T00:00:00.000Z',
        });
        expect(entries[1].payload).toEqual({ provider: 'openai', durationMs: 42 });
    });
});
//# sourceMappingURL=audit-logger.test.js.map