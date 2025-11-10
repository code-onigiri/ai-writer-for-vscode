import * as vscode from 'vscode';

import { PersonaEditorPanel } from '../views/persona-editor-panel.js';

import type { CommandContext, CommandResult, PersonaManagerLike } from './types.js';

/**
 * Handler for listing personas
 */
export async function listPersonasHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Show quick pick with available personas
    const personas = [
      { label: 'Technical Writer', description: 'Professional technical writing style' },
      { label: 'Casual Blogger', description: 'Friendly and conversational tone' },
      { label: 'Academic', description: 'Formal academic writing style' },
    ];

    const selected = await vscode.window.showQuickPick(personas, {
      placeHolder: 'Select a persona to view or edit',
      title: 'AI Writer Personas',
    });

    if (!selected) {
      return { kind: 'cancelled' };
    }

    outputChannel.appendLine(`Selected persona: ${selected.label}`);
    vscode.window.showInformationMessage(`Persona: ${selected.label}`);

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handler for creating a new persona
 */
export async function createPersonaHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const manager: PersonaManagerLike | undefined = context.services?.personaManager;
  if (!manager) {
    const message = 'Persona manager not available. Ensure base services initialized correctly.';
    context.outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return { kind: 'err', error: message };
  }

  try {
    // Open the persona editor panel for creating a new persona
    PersonaEditorPanel.createOrShow(context.extensionContext.extensionUri, manager);
    context.outputChannel.appendLine('Opened persona editor for new persona');
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to open persona editor: ${message}`);
    return { kind: 'err', error: message };
  }
}

/**
 * Handler for editing an existing persona
 */
export async function editPersonaHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const manager: PersonaManagerLike | undefined = context.services?.personaManager;
  if (!manager) {
    const message = 'Persona manager not available. Ensure base services initialized correctly.';
    context.outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
    return { kind: 'err', error: message };
  }

  try {
    const result = await manager.listPersonas();
    if (result.kind === 'err' || !result.value || result.value.length === 0) {
      const message = result.kind === 'err'
        ? result.error.message
        : 'No personas available to edit';
      vscode.window.showInformationMessage(message);
      context.outputChannel.appendLine(message);
      return { kind: 'err', error: message };
    }

    const picks = result.value.map((persona) => ({
      label: persona.name,
      description: `${persona.tone} • ${persona.audience}`,
      detail: persona.metadata.source,
      persona,
    }));

    const selected = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select a persona to edit',
      title: 'Edit Persona',
    });

    if (!selected) {
      return { kind: 'cancelled' };
    }

    PersonaEditorPanel.createOrShow(
      context.extensionContext.extensionUri,
      manager,
      selected.persona
    );
    context.outputChannel.appendLine(`Opened persona editor for: ${selected.persona.id}`);
    return { kind: 'ok', value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.outputChannel.appendLine(`Failed to edit persona: ${message}`);
    return { kind: 'err', error: message };
  }
}

/**
 * Handler for validating persona-template compatibility
 */
export async function validateCompatibilityHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Mock validation for demonstration
    const validation = {
      compatible: false,
      warnings: ['Persona tone "casual" may not match template expectations: professional'],
      suggestions: ['Consider adjusting persona tone to match template requirements'],
    };

    let message = validation.compatible 
      ? '✅ Persona and template are compatible' 
      : '⚠️ Compatibility issues detected';

    if (validation.warnings.length > 0) {
      message += '\n\nWarnings:\n' + validation.warnings.map(w => `• ${w}`).join('\n');
    }

    if (validation.suggestions.length > 0) {
      message += '\n\nSuggestions:\n' + validation.suggestions.map(s => `• ${s}`).join('\n');
    }

    outputChannel.appendLine(message);
    
    if (validation.compatible) {
      vscode.window.showInformationMessage('Persona and template are compatible');
    } else {
      vscode.window.showWarningMessage('Compatibility issues detected. Check output for details.');
    }

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
