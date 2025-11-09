import * as vscode from 'vscode';

import type { CommandHandler } from '../types.js';

/**
 * Input for starting draft generation
 */
export interface StartDraftInput {
  readonly outlineId?: string;
  readonly templateId?: string;
  readonly personaId?: string;
}

/**
 * Handler for starting draft generation
 */
export const startDraftHandler: CommandHandler<StartDraftInput, string> = async (
  context,
  input,
) => {
  try {
    // Prompt for outline ID if not provided
    let outlineId = input?.outlineId;
    if (!outlineId) {
      outlineId = await vscode.window.showInputBox({
        prompt: 'Enter the outline ID to generate draft from',
        placeHolder: 'e.g., outline-123',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Outline ID cannot be empty';
          }
          return undefined;
        },
      });

      if (!outlineId) {
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

    context.outputChannel.appendLine(`Starting draft generation for outline: ${outlineId}`);

    const result = await context.orchestrator.startDraftCycle({
      outlineId,
      personaId: input?.personaId,
      templateId: input?.templateId,
    });

    if (result.kind === 'ok' && result.value) {
      const sessionId = result.value.sessionId;
      vscode.window.showInformationMessage(`Started draft generation (Session: ${sessionId})`);
      return { kind: 'ok', value: sessionId };
    }

    const errMsg = result.kind === 'err' && result.error ? result.error.message ?? String(result.error) : 'Unknown error from orchestrator';
    context.outputChannel.appendLine(`Draft generation failed: ${errMsg}`);
    vscode.window.showErrorMessage(`Draft generation failed: ${errMsg}`);
    return { kind: 'err', error: errMsg };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
