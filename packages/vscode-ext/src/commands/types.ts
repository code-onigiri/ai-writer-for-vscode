import type * as vscode from 'vscode';

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
}

/**
 * Command handler
 */
export type CommandHandler<TInput = void, TOutput = void> = (
  context: CommandContext,
  input: TInput,
) => Promise<CommandResult<TOutput>>;
