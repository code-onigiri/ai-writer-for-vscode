import * as vscode from 'vscode';

import { DocumentRevisionPanel } from '../views/document-revision-panel.js';
import { ProviderSettingsPanel } from '../views/provider-settings-panel.js';

import type { CommandContext, CommandResult } from './types.js';

/**
 * Handler for configuring AI providers
 */
export async function configureProvidersHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  try {
    ProviderSettingsPanel.createOrShow(
      context.extensionContext.extensionUri,
      context.extensionContext
    );
    context.outputChannel.appendLine('Opened provider settings panel');
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to open provider settings: ${message}`);
    return { kind: 'err', error: message };
  }
}

/**
 * Handler for revising current document
 */
export async function reviseDocumentHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      const message = 'No active text editor found';
      void vscode.window.showErrorMessage(message);
      return { kind: 'err', error: message };
    }

    DocumentRevisionPanel.createOrShow(context.extensionContext.extensionUri);
    context.outputChannel.appendLine(`Opened document revision panel for: ${editor.document.fileName}`);
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to open document revision panel: ${message}`);
    return { kind: 'err', error: message };
  }
}
