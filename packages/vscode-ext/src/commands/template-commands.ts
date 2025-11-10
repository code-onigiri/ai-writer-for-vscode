import * as vscode from 'vscode';

import type { CommandContext, CommandResult } from './types.js';

/**
 * Handler for listing templates
 */
export async function listTemplatesHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Show quick pick with available templates
    const templates = [
      { label: 'Tutorial Template', description: 'For technical tutorials' },
      { label: 'Blog Post Template', description: 'For blog articles' },
      { label: 'Documentation Template', description: 'For technical documentation' },
    ];

    const selected = await vscode.window.showQuickPick(templates, {
      placeHolder: 'Select a template to view or edit',
      title: 'AI Writer Templates',
    });

    if (!selected) {
      return { kind: 'cancelled' };
    }

    outputChannel.appendLine(`Selected template: ${selected.label}`);
    vscode.window.showInformationMessage(`Template: ${selected.label}`);

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handler for creating a new template
 */
export async function createTemplateHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter template name',
      placeHolder: 'My Template',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Template name cannot be empty';
        }
        return undefined;
      },
    });

    if (!name) {
      return { kind: 'cancelled' };
    }

    outputChannel.appendLine(`Creating template: ${name}`);
    vscode.window.showInformationMessage(`Template "${name}" created successfully`);

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handler for viewing compliance report
 */
export async function viewComplianceReportHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Mock compliance data for demonstration
    const complianceData = {
      totalPoints: 10,
      compliantPoints: 8,
      complianceRate: 0.8,
    };

    const message = `Compliance Report\n\nTotal Points: ${complianceData.totalPoints}\nCompliant Points: ${complianceData.compliantPoints}\nCompliance Rate: ${(complianceData.complianceRate * 100).toFixed(1)}%`;

    outputChannel.appendLine(message);
    vscode.window.showInformationMessage(
      `Compliance Rate: ${(complianceData.complianceRate * 100).toFixed(1)}%`,
    );

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
