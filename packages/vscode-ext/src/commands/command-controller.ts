import * as vscode from 'vscode';

import type {
  CommandContext,
  CommandHandler,
  ExtensionServices,
  OrchestratorLike,
} from './types.js';

/**
 * Command descriptor
 */
interface CommandDescriptor<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly handler: CommandHandler<TInput, TOutput>;
  readonly title: string;
  readonly description?: string;
}

/**
 * Command Controller
 */
export class CommandController {
  private readonly commands: Map<string, CommandDescriptor> = new Map<string, CommandDescriptor>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly context: CommandContext;

  constructor(
    extensionContext: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    orchestrator?: OrchestratorLike,
    services?: ExtensionServices,
  ) {
    this.context = {
      extensionContext,
      outputChannel,
      orchestrator,
      services,
    };
  }

  /**
   * Register a command
   */
  registerCommand<TInput = unknown, TOutput = unknown>(
    descriptor: CommandDescriptor<TInput, TOutput>,
  ): void {
    this.commands.set(descriptor.id, descriptor as CommandDescriptor);

    const disposable = vscode.commands.registerCommand(
      descriptor.id,
      async (input?: TInput) => {
        return this.executeCommand(descriptor, input);
      },
    );

    this.disposables.push(disposable);
    this.context.extensionContext.subscriptions.push(disposable);
  }

  /**
   * Execute a command
   */
  private async executeCommand<TInput, TOutput>(
    descriptor: CommandDescriptor<TInput, TOutput>,
    input?: TInput,
  ): Promise<TOutput | undefined> {
    this.context.outputChannel.appendLine(`Executing command: ${descriptor.id}`);

    try {
      const result = await descriptor.handler(this.context, input as TInput);

      if (result.kind === 'ok') {
        this.context.outputChannel.appendLine(`Command ${descriptor.id} completed successfully`);
        return result.value;
      } else if (result.kind === 'cancelled') {
        this.context.outputChannel.appendLine(`Command ${descriptor.id} was cancelled`);
        return undefined;
      } else {
        this.context.outputChannel.appendLine(`Command ${descriptor.id} failed: ${result.error}`);
        vscode.window.showErrorMessage(`Command failed: ${result.error}`);
        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.outputChannel.appendLine(`Command ${descriptor.id} threw error: ${errorMessage}`);
      vscode.window.showErrorMessage(`Command error: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * Get all registered command IDs
   */
  getCommandIds(): readonly string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Dispose all command registrations
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}
