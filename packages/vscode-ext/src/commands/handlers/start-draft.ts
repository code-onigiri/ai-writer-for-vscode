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

    // TODO: Integrate with Generation Orchestrator
    context.outputChannel.appendLine(`Starting draft generation for outline: ${outlineId}`);
    
    // For now, return a placeholder session ID
    const sessionId = `draft-session-${Date.now()}`;
    
    vscode.window.showInformationMessage(`Started draft generation (Session: ${sessionId})`);
    
    return { kind: 'ok', value: sessionId };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
