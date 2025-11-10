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

    // Create a temporary session ID for tracking
    const tempSessionId = 'temp-' + Date.now();

    // Show progress panel with initial state
    if (context.services?.progressPanel) {
      context.services.progressPanel.show({
        sessionId: tempSessionId,
        mode: 'outline',
        currentStep: 'generate',
        steps: [
          {
            type: 'generate',
            status: 'running',
            timestamp: new Date().toISOString(),
          },
        ],
        isStreaming: true,
      });

      // ストリーミングを開始
      context.services.progressPanel.startStreaming('generate');

      // Simulate streaming for demonstration purposes
      // In real implementation, this would be driven by the orchestrator
      const simulateStreaming = async () => {
        const chunks = [
          '# アウトライン生成中...\n\n',
          '## Section 1: Introduction\n',
          '- 導入部分の説明\n',
          '- 背景と目的\n',
          '- 概要の提示\n\n',
          '## Section 2: Main Content\n',
          '- メインポイント1\n',
          '- メインポイント2\n',
          '- 詳細な説明\n\n',
          '## Section 3: Conclusion\n',
          '- まとめ\n',
          '- 今後の展望\n',
        ];

        for (const chunk of chunks) {
          await new Promise(resolve => setTimeout(resolve, 200));
          context.services?.progressPanel.appendStreamContent('generate', chunk);
        }

        // ストリーミングを終了
        await new Promise(resolve => setTimeout(resolve, 500));
        context.services?.progressPanel.stopStreaming('generate', chunks.join(''));
      };

      void simulateStreaming();
    }

    const result = await context.orchestrator.startOutlineCycle({
      idea,
      personaId: input?.personaId,
      templateId: input?.templateId,
      historyDepth: 5,
    });

    if (result.kind === 'ok' && result.value) {
      const sessionId = result.value.sessionId;
      
      // Update progress panel with actual session ID and add critique step
      if (context.services?.progressPanel) {
        context.services.progressPanel.updateState({
          sessionId,
          currentStep: 'critique',
          steps: [
            {
              type: 'generate',
              status: 'completed',
              timestamp: new Date().toISOString(),
              content: 'Outline generated successfully',
            },
            {
              type: 'critique',
              status: 'running',
              timestamp: new Date().toISOString(),
              content: 'Analyzing outline structure...',
            },
          ],
          isStreaming: false,
        });

        // Simulate critique completion
        setTimeout(() => {
          context.services?.progressPanel.updateState({
            currentStep: 'completed',
            steps: [
              {
                type: 'generate',
                status: 'completed',
                timestamp: new Date(Date.now() - 2000).toISOString(),
                content: 'Outline generated successfully',
              },
              {
                type: 'critique',
                status: 'completed',
                timestamp: new Date().toISOString(),
                content: 'Outline structure is well-organized. Consider adding more detail to section 2.',
              },
            ],
            isStreaming: false,
          });
        }, 1500);
      }

      // Update session manager
      if (context.services?.sessionManager) {
        context.services.sessionManager.upsertSession({
          id: sessionId,
          mode: 'outline',
          idea,
          personaId: input?.personaId,
          templateId: input?.templateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'running',
          progressMessage: 'Outline generation in progress',
          previewContent: `# Outline for: ${idea}\n\nGeneration in progress...`,
        });
      }

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
