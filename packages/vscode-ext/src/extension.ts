import * as vscode from 'vscode';

import { 
  CommandController, 
  startOutlineHandler, 
  startDraftHandler,
  listTemplatesHandler,
  createTemplateHandler,
  editTemplateHandler,
  viewComplianceReportHandler,
  listPersonasHandler,
  createPersonaHandler,
  editPersonaHandler,
  validateCompatibilityHandler,
  viewStorageStatsHandler,
  viewAuditStatsHandler,
  cleanupStorageHandler,
  configureProvidersHandler,
  reviseDocumentHandler,
} from './commands/index.js';
import { SessionManager } from './services/session-manager.js';
import { SessionTreeDataProvider } from './views/session-tree-provider.js';
import { TemplateDetailViewProvider } from './views/template-detail-view-provider.js';
import { TemplateTreeDataProvider } from './views/template-tree-provider.js';
import { ProgressPanelProvider } from './views/progress-panel-provider.js';
import { MainDashboardPanel } from './views/main-dashboard-panel.js';
import { SettingsPanel } from './views/settings-panel.js';
import { SidebarWebviewProvider } from './views/sidebar-webview-provider.js';
import { LanguageModelChatProvider } from './integrations/language-model-bridge.js';
import { LanguageModelToolManager } from './integrations/language-model-tools.js';

import type { OrchestratorLike, TemplateRegistryLike, PersonaManagerLike } from './commands/types.js';

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
  let personaManager: PersonaManagerLike | undefined;
  try {
    // Use a computed import string to reduce static analysis by TypeScript tooling.
    const pkg = '@ai-writer/base';
    const base: unknown = await import(pkg);
    const maybeBase = base as { 
      createGenerationOrchestrator?: unknown;
      createTemplateRegistry?: unknown;
      createPersonaManager?: unknown;
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
    if (maybeBase && typeof maybeBase.createPersonaManager === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- runtime-checked
      personaManager = maybeBase.createPersonaManager();
    }
  } catch (err) {
    // Non-fatal: log to output channel. Handlers will show an error if orchestrator is missing.
    outputChannel.appendLine(`Could not initialize orchestrator/registry/personaManager: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Create tree data providers (kept for backward compatibility but hidden)
  const sessionTreeProvider = new SessionTreeDataProvider(sessionManager);
  const templateTreeProvider = new TemplateTreeDataProvider(templateRegistry);
  const templateDetailProvider = new TemplateDetailViewProvider(context.extensionUri, templateRegistry);
  const progressPanelProvider = new ProgressPanelProvider();

  // Create new sidebar webview provider
  const sidebarProvider = new SidebarWebviewProvider(context.extensionUri);

  // Create GUI panels (kept for backward compatibility)
  const mainDashboard = new MainDashboardPanel(
    context.extensionUri,
    async (action) => {
      switch (action.type) {
        case 'startOutline':
          await vscode.commands.executeCommand('ai-writer.startOutline');
          break;
        case 'startDraft':
          await vscode.commands.executeCommand('ai-writer.startDraft');
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('ai-writer.openSettingsPanel');
          break;
        case 'openSession':
          if (action.payload && typeof action.payload === 'object' && 'sessionId' in action.payload) {
            await vscode.commands.executeCommand('ai-writer.openSession', action.payload.sessionId);
          }
          break;
        case 'openTemplate':
          if (action.payload && typeof action.payload === 'object' && 'templateId' in action.payload) {
            await vscode.commands.executeCommand('ai-writer.showTemplateDetails', action.payload.templateId);
          }
          break;
      }
    }
  );
  context.subscriptions.push(mainDashboard);

  const settingsPanel = new SettingsPanel(
    context.extensionUri,
    async (data) => {
      if (data.providers) {
        outputChannel.appendLine(`Saving ${data.providers.length} provider configurations`);
        // TODO: Implement actual saving logic
      }
      if (data.templates) {
        outputChannel.appendLine(`Saving ${data.templates.length} template configurations`);
        // TODO: Implement actual saving logic
      }
      if (data.personas) {
        outputChannel.appendLine(`Saving ${data.personas.length} persona configurations`);
        // TODO: Implement actual saving logic
      }
    }
  );
  context.subscriptions.push(settingsPanel);

  // Register the new sidebar webview
  const sidebarView = vscode.window.registerWebviewViewProvider(
    SidebarWebviewProvider.viewType,
    sidebarProvider
  );
  context.subscriptions.push(sidebarView);

  // Register tree views (kept but hidden via when clause)
  const sessionsView = vscode.window.registerTreeDataProvider('ai-writer.sessionsView', sessionTreeProvider);
  const templatesView = vscode.window.registerTreeDataProvider('ai-writer.templatesView', templateTreeProvider);
  const templateDetailView = vscode.window.registerWebviewViewProvider('ai-writer.templateDetailView', templateDetailProvider);
  
  context.subscriptions.push(sessionsView, templatesView, templateDetailView);

  // Initialize command controller with services
  const services = {
    sessionManager,
    templateRegistry,
    personaManager,
    progressPanel: progressPanelProvider,
    sidebarProvider,
    refreshSessions: () => sessionTreeProvider.refresh(),
    refreshTemplates: () => templateTreeProvider.refresh(),
    refreshPersonas: () => { 
      // TODO: implement when persona tree provider is added
    },
    openTemplateDetail: (templateId: string) => templateDetailProvider.showTemplate(templateId),
    statusBar: statusBarItem,
  };

  commandController = new CommandController(context, outputChannel, orchestrator, services);

  // Update sidebar with initial data
  if (templateRegistry) {
    try {
      const result = await templateRegistry.listTemplates();
      if (result.kind === 'ok') {
        sidebarProvider.updateTemplates(result.value.map(t => ({
          id: t.id,
          name: t.name,
          description: undefined,
          points: t.points?.map(p => ({
            id: p.id,
            title: p.title,
            instructions: p.instructions,
          })) || [],
        })));
      }
    } catch (err) {
      outputChannel.appendLine(`Failed to load templates for sidebar: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (personaManager) {
    try {
      const result = await personaManager.listPersonas();
      if (result.kind === 'ok') {
        sidebarProvider.updatePersonas(result.value.map(p => ({
          id: p.id,
          name: p.name,
          tone: p.tone,
          audience: p.audience,
          parameters: {},
        })));
      }
    } catch (err) {
      outputChannel.appendLine(`Failed to load personas for sidebar: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

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
    id: 'ai-writer.editTemplate',
    title: 'AI Writer: Edit Template',
    description: 'Edit an existing writing template',
    handler: editTemplateHandler,
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
    id: 'ai-writer.editPersona',
    title: 'AI Writer: Edit Persona',
    description: 'Edit an existing writing persona',
    handler: editPersonaHandler,
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

  // Register revision commands
  commandController.registerCommand({
    id: 'ai-writer.configureProviders',
    title: 'AI Writer: Configure AI Providers',
    description: 'Configure AI provider settings and credentials',
    handler: configureProvidersHandler,
  });

  commandController.registerCommand({
    id: 'ai-writer.reviseDocument',
    title: 'AI Writer: Revise Current Document',
    description: 'Get AI-powered suggestions for improving the current document',
    handler: reviseDocumentHandler,
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

  // Register GUI panel commands
  commandController.registerCommand({
    id: 'ai-writer.showDashboard',
    title: 'AI Writer: Show Dashboard',
    description: 'Show the main AI Writer dashboard',
    handler: async () => {
      mainDashboard.show();
      // Update dashboard with current data
      const sessions = sessionManager.getAllSessions().map((s: { id: string; mode: 'outline' | 'draft'; idea?: string; updatedAt: string }) => ({
        id: s.id,
        mode: s.mode,
        idea: s.idea,
        updatedAt: s.updatedAt,
      }));
      mainDashboard.updateSessions(sessions);
      
      // Update templates if available
      if (templateRegistry) {
        try {
          const templates = await templateRegistry.listTemplates();
          if (templates.kind === 'ok') {
            mainDashboard.updateTemplates(templates.value.map(t => ({
              id: t.id,
              name: t.name,
              points: t.points ? t.points.map(p => ({ id: p.id })) : [],
            })));
          }
        } catch (err) {
          outputChannel.appendLine(`Failed to load templates: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return { kind: 'ok' as const, value: undefined };
    },
  });

  commandController.registerCommand({
    id: 'ai-writer.openSettingsPanel',
    title: 'AI Writer: Open Settings Panel',
    description: 'Open the settings panel for configuring AI Writer',
    handler: async () => {
      // Load current settings
      const providers = [
        { id: 'openai', name: 'OpenAI', enabled: true, model: 'gpt-4', temperature: 0.7 },
        { id: 'gemini', name: 'Google Gemini', enabled: false, model: 'gemini-pro', temperature: 0.7 },
      ];
      
      const templates: { id: string; name: string; description?: string; points: { id: string; title: string; instructions: string }[] }[] = [];
      if (templateRegistry) {
        try {
          const result = await templateRegistry.listTemplates();
          if (result.kind === 'ok') {
            templates.push(...result.value.map(t => ({
              id: t.id,
              name: t.name,
              description: undefined, // description not available in TemplateDescriptorLike
              points: t.points?.map(p => ({
                id: p.id,
                title: p.title,
                instructions: p.instructions,
              })) || [],
            })));
          }
        } catch (err) {
          outputChannel.appendLine(`Failed to load templates: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const personas: { id: string; name: string; enabled: boolean; tone?: string; audience?: string; parameters: Record<string, string> }[] = [];
      if (personaManager) {
        try {
          const result = await personaManager.listPersonas();
          if (result.kind === 'ok') {
            personas.push(...result.value.map(p => ({
              id: p.id,
              name: p.name,
              enabled: true, // enabled not available in PersonaDefinitionLike
              tone: p.tone,
              audience: p.audience,
              parameters: {}, // parameters not available in PersonaDefinitionLike
            })));
          }
        } catch (err) {
          outputChannel.appendLine(`Failed to load personas: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      settingsPanel.show({ providers, templates, personas });
      return { kind: 'ok' as const, value: undefined };
    },
  });

  // Initialize Language Model integration (Task 6)
  outputChannel.appendLine('Initializing Language Model integration...');
  
  // Initialize Language Model Chat Provider
  const languageModelProvider = new LanguageModelChatProvider();
  const isLMAvailable = await languageModelProvider.isAvailable();
  
  if (isLMAvailable) {
    outputChannel.appendLine('Language Model API is available');
    
    // Try to initialize with default model
    const initialized = await languageModelProvider.initialize();
    if (initialized) {
      const modelInfo = languageModelProvider.getCurrentModelInfo();
      outputChannel.appendLine(`Initialized with model: ${modelInfo?.name || 'unknown'}`);
    } else {
      outputChannel.appendLine('No language models available at this time');
    }
  } else {
    outputChannel.appendLine('Language Model API is not available in this VSCode version');
  }
  
  // Register Language Model Tools
  const toolManager = new LanguageModelToolManager();
  const toolDisposables = toolManager.registerTools();
  
  if (toolDisposables.length > 0) {
    outputChannel.appendLine(`Registered ${toolDisposables.length} Language Model tools`);
    context.subscriptions.push(...toolDisposables);
    context.subscriptions.push({
      dispose: () => toolManager.dispose(),
    });
  } else {
    outputChannel.appendLine('Language Model Tools API not available or no tools registered');
  }

  outputChannel.appendLine('AI Writer extension activated with all commands, views, and Language Model integration');
}

export function deactivate(): void {
  if (commandController) {
    commandController.dispose();
    commandController = undefined;
  }
}
