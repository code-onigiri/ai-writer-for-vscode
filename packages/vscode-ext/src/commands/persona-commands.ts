import * as vscode from 'vscode';

import type { CommandContext, CommandResult } from './types.js';

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
  const { outputChannel } = context;

  try {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter persona name',
      placeHolder: 'My Persona',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Persona name cannot be empty';
        }
        return undefined;
      },
    });

    if (!name) {
      return { kind: 'cancelled' };
    }

    const tone = await vscode.window.showQuickPick(
      ['professional', 'casual', 'academic', 'technical'],
      {
        placeHolder: 'Select writing tone',
        title: 'Persona Tone',
      },
    );

    if (!tone) {
      return { kind: 'cancelled' };
    }

    const audience = await vscode.window.showQuickPick(
      ['developers', 'general', 'experts', 'beginners'],
      {
        placeHolder: 'Select target audience',
        title: 'Target Audience',
      },
    );

    if (!audience) {
      return { kind: 'cancelled' };
    }

    outputChannel.appendLine(`Creating persona: ${name} (${tone}, ${audience})`);
    vscode.window.showInformationMessage(`Persona "${name}" created successfully`);

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
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
