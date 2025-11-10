import * as vscode from 'vscode';

import { 
  CommandController, 
  startOutlineHandler, 
  startDraftHandler,
  listTemplatesHandler,
  createTemplateHandler,
  viewComplianceReportHandler,
  listPersonasHandler,
  createPersonaHandler,
  validateCompatibilityHandler,
  viewStorageStatsHandler,
  viewAuditStatsHandler,
  cleanupStorageHandler,
} from './commands/index.js';

import type { OrchestratorLike } from './commands/types.js';

let commandController: CommandController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('AI Writer');
  context.subscriptions.push(outputChannel);

  // Initialize orchestrator (dynamically import to avoid compile-time package boundary issues)
  let orchestrator: OrchestratorLike | undefined;
  try {
    // Use a computed import string to reduce static analysis by TypeScript tooling.
    const pkg = '@ai-writer/base';
    const base: unknown = await import(pkg);
    const maybeBase = base as { createGenerationOrchestrator?: unknown };
    if (maybeBase && typeof maybeBase.createGenerationOrchestrator === 'function') {
      // safe to call because we checked the type at runtime
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- runtime-checked
      orchestrator = maybeBase.createGenerationOrchestrator();
    }
  } catch (err) {
    // Non-fatal: log to output channel. Handlers will show an error if orchestrator is missing.
    outputChannel.appendLine(`Could not initialize orchestrator: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Initialize command controller
  commandController = new CommandController(context, outputChannel, orchestrator);

  // Register generation commands
  commandController.registerCommand({
    id: 'ai-writer.startOutline',
    title: 'AI Writer: Start Outline Generation',
    description: 'Start generating an outline for your article',
    handler: startOutlineHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.startDraft',
    title: 'AI Writer: Start Draft Generation',
    description: 'Start generating a draft from an outline',
    handler: startDraftHandler,
  });

  // Register template commands
  commandController.registerCommand({
    id: 'ai-writer.listTemplates',
    title: 'AI Writer: List Templates',
    description: 'View and manage writing templates',
    handler: listTemplatesHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.createTemplate',
    title: 'AI Writer: Create Template',
    description: 'Create a new writing template',
    handler: createTemplateHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.viewComplianceReport',
    title: 'AI Writer: View Compliance Report',
    description: 'View template compliance report for current session',
    handler: viewComplianceReportHandler,
  });

  // Register persona commands
  commandController.registerCommand({
    id: 'ai-writer.listPersonas',
    title: 'AI Writer: List Personas',
    description: 'View and manage writing personas',
    handler: listPersonasHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.createPersona',
    title: 'AI Writer: Create Persona',
    description: 'Create a new writing persona',
    handler: createPersonaHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.validateCompatibility',
    title: 'AI Writer: Validate Persona-Template Compatibility',
    description: 'Check if persona and template are compatible',
    handler: validateCompatibilityHandler,
  });

  // Register statistics commands
  commandController.registerCommand({
    id: 'ai-writer.viewStorageStats',
    title: 'AI Writer: View Storage Statistics',
    description: 'View storage usage statistics',
    handler: viewStorageStatsHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.viewAuditStats',
    title: 'AI Writer: View Audit Statistics',
    description: 'View audit log and provider statistics',
    handler: viewAuditStatsHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.cleanupStorage',
    title: 'AI Writer: Cleanup Old Sessions',
    description: 'Delete old sessions to free up space',
    handler: cleanupStorageHandler,
  });

  outputChannel.appendLine('AI Writer extension activated with all commands registered');
}

export function deactivate(): void {
  if (commandController) {
    commandController.dispose();
    commandController = undefined;
  }
}
