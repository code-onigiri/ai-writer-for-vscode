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

    // Show progress panel with initial state
    const tempSessionId = 'temp-' + Date.now();
    if (context.services?.progressPanel) {
      context.services.progressPanel.show({
        sessionId: tempSessionId,
        mode: 'draft',
        currentStep: 'generate',
        steps: [
          {
            type: 'generate',
            status: 'running',
            timestamp: new Date().toISOString(),
            content: 'Generating draft from outline...',
          },
        ],
        isStreaming: true,
      });

      // Simulate streaming
      setTimeout(() => {
        context.services?.progressPanel.appendStreamContent('generate', '\n\nIntroduction paragraph with engaging opening...\n');
      }, 500);
    }

    const result = await context.orchestrator.startDraftCycle({
      outlineId,
      personaId: input?.personaId,
      templateId: input?.templateId,
    });

    if (result.kind === 'ok' && result.value) {
      const sessionId = result.value.sessionId;
      
      // Update progress panel
      if (context.services?.progressPanel) {
        context.services.progressPanel.updateState({
          sessionId,
          currentStep: 'critique',
          steps: [
            {
              type: 'generate',
              status: 'completed',
              timestamp: new Date().toISOString(),
              content: 'Draft generated successfully',
            },
            {
              type: 'critique',
              status: 'running',
              timestamp: new Date().toISOString(),
              content: 'Reviewing draft quality...',
            },
          ],
          isStreaming: false,
        });
      }

      // Update session manager
      if (context.services?.sessionManager) {
        context.services.sessionManager.upsertSession({
          id: sessionId,
          mode: 'draft',
          outlineId,
          personaId: input?.personaId,
          templateId: input?.templateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'running',
          progressMessage: 'Draft generation in progress',
          previewContent: `# Draft from outline: ${outlineId}\n\nGeneration in progress...`,
        });
      }

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
