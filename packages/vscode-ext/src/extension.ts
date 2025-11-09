import * as vscode from 'vscode';

import { CommandController, startOutlineHandler, startDraftHandler } from './commands/index.js';

import type { OrchestratorLike } from './commands/types.js';

let commandController: CommandController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('AI Writer');
  context.subscriptions.push(outputChannel);

  // Initialize orchestrator (dynamically import to avoid compile-time package boundary issues)
  let orchestrator: OrchestratorLike | undefined;
  try {
    // Use a computed import string to reduce static analysis by TypeScript tooling.
    const pkg = '@ai-writer/base';
    const base: unknown = await import(pkg);
    const maybeBase = base as { createGenerationOrchestrator?: unknown };
    if (maybeBase && typeof maybeBase.createGenerationOrchestrator === 'function') {
      // safe to call because we checked the type at runtime
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- runtime-checked
      orchestrator = maybeBase.createGenerationOrchestrator();
    }
  } catch (err) {
    // Non-fatal: log to output channel. Handlers will show an error if orchestrator is missing.
    outputChannel.appendLine(`Could not initialize orchestrator: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Initialize command controller
  commandController = new CommandController(context, outputChannel, orchestrator);

  // Register commands
  commandController.registerCommand({
    id: 'ai-writer.startOutline',
    title: 'AI Writer: Start Outline Generation',
    description: 'Start generating an outline for your article',
    handler: startOutlineHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.startDraft',
    title: 'AI Writer: Start Draft Generation',
    description: 'Start generating a draft from an outline',
    handler: startDraftHandler,
  });

  outputChannel.appendLine('AI Writer extension activated');
}

export function deactivate(): void {
  if (commandController) {
    commandController.dispose();
    commandController = undefined;
  }
}
