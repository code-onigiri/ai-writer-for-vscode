import type * as vscode from 'vscode';

/**
 * Minimal orchestrator-like interface used by the extension.
 * We avoid importing the full type from @ai-writer/base here to keep package boundaries
 * and prevent TypeScript rootDir issues in isolated tsconfig builds.
 */
export interface OrchestratorLike {
  startOutlineCycle(input: { idea: string; personaId?: string; templateId?: string; historyDepth: number }): Promise<{
    kind: 'ok' | 'err';
    value?: { sessionId: string };
    error?: { message: string };
  }>;
  startDraftCycle(input: { outlineId: string; personaId?: string; templateId?: string }): Promise<{
    kind: 'ok' | 'err';
    value?: { sessionId: string };
    error?: { message: string };
  }>;
  applyTemplatePoint?(sessionId: string, pointId: string, override?: unknown): Promise<unknown>;
  getSession?(sessionId: string): Promise<unknown>;
  resumeSession?(sessionId: string, step: unknown): Promise<unknown>;
}

/**
 * Command result
 */
export type CommandResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: string }
  | { kind: 'cancelled' };

/**
 * Command handler context
 */
export interface CommandContext {
  readonly extensionContext: vscode.ExtensionContext;
  readonly outputChannel: vscode.OutputChannel;
  readonly orchestrator?: OrchestratorLike;
}

/**
 * Command handler
 */
export type CommandHandler<TInput = void, TOutput = void> = (
  context: CommandContext,
  input: TInput,
) => Promise<CommandResult<TOutput>>;
