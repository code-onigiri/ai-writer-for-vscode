import * as vscode from 'vscode';
import { CommandController } from './commands/index.js';
import { startOutlineHandler, startDraftHandler } from './commands/index.js';

let commandController: CommandController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('AI Writer');
  context.subscriptions.push(outputChannel);

  // Initialize command controller
  commandController = new CommandController(context, outputChannel);

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
