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
import { SessionManager } from './services/session-manager.js';
import { SessionTreeDataProvider } from './views/session-tree-provider.js';
import { TemplateDetailViewProvider } from './views/template-detail-view-provider.js';
import { TemplateTreeDataProvider } from './views/template-tree-provider.js';
import { ProgressPanelProvider } from './views/progress-panel-provider.js';

import type { OrchestratorLike, TemplateRegistryLike } from './commands/types.js';

let commandController: CommandController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('AI Writer');
  context.subscriptions.push(outputChannel);

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(statusBarItem);

  // Create session manager
  const sessionManager = new SessionManager(context, statusBarItem);
  context.subscriptions.push(sessionManager);

  // Initialize orchestrator and registry (dynamically import to avoid compile-time package boundary issues)
  let orchestrator: OrchestratorLike | undefined;
  let templateRegistry: TemplateRegistryLike | undefined;
  try {
    // Use a computed import string to reduce static analysis by TypeScript tooling.
    const pkg = '@ai-writer/base';
    const base: unknown = await import(pkg);
    const maybeBase = base as { 
      createGenerationOrchestrator?: unknown;
      createTemplateRegistry?: unknown;
    };
    if (maybeBase && typeof maybeBase.createGenerationOrchestrator === 'function') {
      // safe to call because we checked the type at runtime
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- runtime-checked
      orchestrator = maybeBase.createGenerationOrchestrator();
    }
    if (maybeBase && typeof maybeBase.createTemplateRegistry === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- runtime-checked
      templateRegistry = maybeBase.createTemplateRegistry();
    }
  } catch (err) {
    // Non-fatal: log to output channel. Handlers will show an error if orchestrator is missing.
    outputChannel.appendLine(`Could not initialize orchestrator/registry: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Create tree data providers
  const sessionTreeProvider = new SessionTreeDataProvider(sessionManager);
  const templateTreeProvider = new TemplateTreeDataProvider(templateRegistry);
  const templateDetailProvider = new TemplateDetailViewProvider(context.extensionUri, templateRegistry);
  const progressPanelProvider = new ProgressPanelProvider();

  // Register tree views
  const sessionsView = vscode.window.registerTreeDataProvider('ai-writer.sessionsView', sessionTreeProvider);
  const templatesView = vscode.window.registerTreeDataProvider('ai-writer.templatesView', templateTreeProvider);
  const templateDetailView = vscode.window.registerWebviewViewProvider('ai-writer.templateDetailView', templateDetailProvider);
  
  context.subscriptions.push(sessionsView, templatesView, templateDetailView);

  // Initialize command controller with services
  const services = {
    sessionManager,
    templateRegistry,
    progressPanel: progressPanelProvider,
    refreshSessions: () => sessionTreeProvider.refresh(),
    refreshTemplates: () => templateTreeProvider.refresh(),
    refreshPersonas: () => { 
      // TODO: implement when persona tree provider is added
    },
    openTemplateDetail: (templateId: string) => templateDetailProvider.showTemplate(templateId),
    statusBar: statusBarItem,
  };

  commandController = new CommandController(context, outputChannel, orchestrator, services);

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

  // Register view-related commands
  commandController.registerCommand({
    id: 'ai-writer.openSession',
    title: 'Open Session',
    description: 'Open a session preview',
    handler: async (context, sessionId: string) => {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        return { kind: 'err' as const, error: `Session ${sessionId} not found` };
      }
      await sessionManager.openSessionPreview(session);
      return { kind: 'ok' as const, value: undefined };
    },
  });

  commandController.registerCommand({
    id: 'ai-writer.showTemplateDetails',
    title: 'Show Template Details',
    description: 'Show details of a template',
    handler: async (_context, templateId: string) => {
      await templateDetailProvider.showTemplate(templateId);
      return { kind: 'ok' as const, value: undefined };
    },
  });

  commandController.registerCommand({
    id: 'ai-writer.refreshSessions',
    title: 'Refresh Sessions',
    description: 'Refresh the sessions view',
    handler: async () => {
      sessionTreeProvider.refresh();
      return { kind: 'ok' as const, value: undefined };
    },
  });

  commandController.registerCommand({
    id: 'ai-writer.refreshTemplates',
    title: 'Refresh Templates',
    description: 'Refresh the templates view',
    handler: async () => {
      templateTreeProvider.refresh();
      return { kind: 'ok' as const, value: undefined };
    },
  });

  outputChannel.appendLine('AI Writer extension activated with all commands and views registered');
}

export function deactivate(): void {
  if (commandController) {
    commandController.dispose();
    commandController = undefined;
  }
}
