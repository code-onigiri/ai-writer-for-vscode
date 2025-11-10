import * as vscode from 'vscode';

import { TemplateEditorPanel } from '../views/template-editor-panel.js';

import type {
  CommandContext,
  CommandResult,
  TemplateRegistryLike,
} from './types.js';

/**
 * Handler for listing templates
 */
export async function listTemplatesHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const registry: TemplateRegistryLike | undefined = context.services?.templateRegistry;
  if (!registry) {
    const message = 'Template registry not available. Ensure base services initialized correctly.';
    context.outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return { kind: 'err', error: message };
  }

  try {
    const result = await registry.listTemplates();
    if (result.kind === 'err' || !result.value) {
      const message = result.kind === 'err'
        ? result.error.message
        : 'Template registry returned no data';
      vscode.window.showWarningMessage(`Failed to load templates: ${message}`);
      context.outputChannel.appendLine(`Failed to load templates: ${message}`);
      return { kind: 'err', error: message };
    }

    if (result.value.length === 0) {
      const info = 'No templates yet. Use AI Writer: Create Template to add one.';
      vscode.window.showInformationMessage(info);
      context.outputChannel.appendLine(info);
      return { kind: 'ok', value: undefined };
    }

    const picks = result.value.map((template) => ({
      label: template.name,
      description: `${template.points.length} points`,
      detail: template.metadata.personaHints.join(', ') || undefined,
      templateId: template.id,
    }));

    const selected = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select a template to inspect',
      title: 'AI Writer Templates',
    });

    if (!selected) {
      return { kind: 'cancelled' };
    }

    context.outputChannel.appendLine(`Template selected: ${selected.templateId}`);
    context.services?.openTemplateDetail(selected.templateId);
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to load templates: ${message}`);
    return { kind: 'err', error: message };
  }
}

/**
 * Handler for creating a new template
 */
export async function createTemplateHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const registry: TemplateRegistryLike | undefined = context.services?.templateRegistry;
  if (!registry) {
    const message = 'Template registry not available. Ensure base services initialized correctly.';
    context.outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return { kind: 'err', error: message };
  }

  try {
    // Open the template editor panel for creating a new template
    TemplateEditorPanel.createOrShow(context.extensionContext.extensionUri, registry);
    context.outputChannel.appendLine('Opened template editor for new template');
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to open template editor: ${message}`);
    return { kind: 'err', error: message };
  }
}

/**
 * Handler for editing an existing template
 */
export async function editTemplateHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const registry: TemplateRegistryLike | undefined = context.services?.templateRegistry;
  if (!registry) {
    const message = 'Template registry not available. Ensure base services initialized correctly.';
    context.outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return { kind: 'err', error: message };
  }

  try {
    const result = await registry.listTemplates();
    if (result.kind === 'err' || !result.value || result.value.length === 0) {
      const message = result.kind === 'err'
        ? result.error.message
        : 'No templates available to edit';
      vscode.window.showInformationMessage(message);
      context.outputChannel.appendLine(message);
      return { kind: 'err', error: message };
    }

    const picks = result.value.map((template) => ({
      label: template.name,
      description: `${template.points.length} points`,
      detail: template.metadata.personaHints.join(', ') || undefined,
      template,
    }));

    const selected = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select a template to edit',
      title: 'Edit Template',
    });

    if (!selected) {
      return { kind: 'cancelled' };
    }

    TemplateEditorPanel.createOrShow(
      context.extensionContext.extensionUri,
      registry,
      selected.template
    );
    context.outputChannel.appendLine(`Opened template editor for: ${selected.template.id}`);
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to edit template: ${message}`);
    return { kind: 'err', error: message };
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
