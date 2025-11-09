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

    // TODO: Integrate with Generation Orchestrator
    context.outputChannel.appendLine(`Starting outline generation for: ${idea}`);
    
    // For now, return a placeholder session ID
    const sessionId = `session-${Date.now()}`;
    
    vscode.window.showInformationMessage(`Started outline generation (Session: ${sessionId})`);
    
    return { kind: 'ok', value: sessionId };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
