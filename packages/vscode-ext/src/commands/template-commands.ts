import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

import type {
  CommandContext,
  CommandResult,
  TemplateDraftLike,
  TemplatePointLike,
  TemplateRegistryLike,
} from './types.js';

const DEFAULT_PRIORITY_STEP = 10;

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
    const name = await vscode.window.showInputBox({
      prompt: 'Enter template name',
      placeHolder: 'My AI Writer Template',
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

    const pointsRaw = await vscode.window.showInputBox({
      prompt: 'List template instructions (one per line)',
      placeHolder: 'Introduction\nKey benefits\nCall to action',
      validateInput: (value) => {
        if (!value || value.split('\n').every((line) => line.trim().length === 0)) {
          return 'Provide at least one instruction';
        }
        return undefined;
      },
      value: 'Introduction\nKey benefits\nCall to action',
      ignoreFocusOut: true,
    });

    if (!pointsRaw) {
      return { kind: 'cancelled' };
    }

    const personaHintsRaw = await vscode.window.showInputBox({
      prompt: 'Optional persona hints (comma separated)',
      placeHolder: 'tone:professional,audience:developers',
      ignoreFocusOut: true,
    });

    const draft: TemplateDraftLike = {
      name,
      points: buildTemplatePoints(pointsRaw),
      personaHints: personaHintsRaw
        ? personaHintsRaw
            .split(',')
            .map((hint) => hint.trim())
            .filter((hint) => hint.length > 0)
        : [],
    };

    const createResult = await registry.createTemplate(draft);
    if (createResult.kind === 'err' || !createResult.value) {
      const message = createResult.kind === 'err'
        ? createResult.error.message
        : 'Unknown error while creating template';
      vscode.window.showErrorMessage(`Failed to create template: ${message}`);
      context.outputChannel.appendLine(`Failed to create template: ${message}`);
      return { kind: 'err', error: message };
    }

    context.outputChannel.appendLine(`Template created: ${createResult.value.id}`);
    vscode.window.showInformationMessage(`Template "${createResult.value.name}" created successfully`);
    context.services?.refreshTemplates();
    context.services?.openTemplateDetail(createResult.value.id);
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to create template: ${message}`);
    return { kind: 'err', error: message };
  }
}

function buildTemplatePoints(raw: string): TemplatePointLike[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((content, index) => ({
      id: randomUUID(),
      title: derivePointTitle(content, index),
      instructions: content,
      priority: (index + 1) * DEFAULT_PRIORITY_STEP,
    }));
}

function derivePointTitle(content: string, index: number): string {
  const candidate = content.split(/[.:\-]/, 1)[0]?.trim();
  if (candidate && candidate.length > 0) {
    return candidate;
  }
  return `Point ${index + 1}`;
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
