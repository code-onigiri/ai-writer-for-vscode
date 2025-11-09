import * as vscode from 'vscode';

import type { CommandHandler } from '../types.js';

/**
 * Input for starting outline generation
 */
export interface StartOutlineInput {
  readonly idea?: string;
  readonly templateId?: string;
  readonly personaId?: string;
}

/**
 * Handler for starting outline generation
 */
export const startOutlineHandler: CommandHandler<StartOutlineInput, string> = async (
  context,
  input,
) => {
  try {
    // Prompt for idea if not provided
    let idea = input?.idea;
    if (!idea) {
      idea = await vscode.window.showInputBox({
        prompt: 'Enter your article idea or topic',
        placeHolder: 'e.g., Write an article about AI in education',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Idea cannot be empty';
          }
          return undefined;
        },
      });

      if (!idea) {
        return { kind: 'cancelled' };
      }
    }

    // Integrate with orchestrator if available
    if (!context.orchestrator) {
      const msg = 'Orchestrator is not available in the extension context.';
      context.outputChannel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return { kind: 'err', error: msg };
    }

    context.outputChannel.appendLine(`Starting outline generation for: ${idea}`);

    const result = await context.orchestrator.startOutlineCycle({
      idea,
      personaId: input?.personaId,
      templateId: input?.templateId,
      historyDepth: 5,
    });

    if (result.kind === 'ok' && result.value) {
      const sessionId = result.value.sessionId;
      vscode.window.showInformationMessage(`Started outline generation (Session: ${sessionId})`);
      return { kind: 'ok', value: sessionId };
    }

    const errMsg = result.kind === 'err' && result.error ? result.error.message ?? String(result.error) : 'Unknown error from orchestrator';
    context.outputChannel.appendLine(`Outline generation failed: ${errMsg}`);
    vscode.window.showErrorMessage(`Outline generation failed: ${errMsg}`);
    return { kind: 'err', error: errMsg };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
