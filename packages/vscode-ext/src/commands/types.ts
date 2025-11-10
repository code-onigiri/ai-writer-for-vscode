import type * as vscode from 'vscode';
import type { SessionManager } from '../services/session-manager.js';
import type { ProgressPanelProvider } from '../views/progress-panel-provider.js';

export interface TemplatePointLike {
  readonly id: string;
  readonly title: string;
  readonly instructions: string;
  readonly priority: number;
}

export interface TemplateDescriptorLike {
  readonly id: string;
  readonly name: string;
  readonly points: readonly TemplatePointLike[];
  readonly metadata: {
    readonly personaHints: readonly string[];
    readonly createdAt: string;
    readonly updatedAt: string;
  };
}

export interface TemplateDraftLike {
  readonly name: string;
  readonly points: readonly TemplatePointLike[];
  readonly personaHints?: readonly string[];
}

export interface TemplateOperationError {
  readonly code?: string;
  readonly message: string;
  readonly recoverable?: boolean;
}

export type TemplateOperationResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: TemplateOperationError };

export interface CompliancePointReportLike {
  readonly pointId: string;
  readonly compliant: boolean;
  readonly notes: string;
  readonly timestamp: string;
}

export interface ComplianceReportLike {
  readonly sessionId: string;
  readonly totalPoints: number;
  readonly compliantPoints: number;
  readonly complianceRate: number;
  readonly pointReports: readonly CompliancePointReportLike[];
}

export interface TemplateRegistryLike {
  createTemplate(draft: TemplateDraftLike): Promise<TemplateOperationResult<TemplateDescriptorLike>>;
  loadTemplate(id: string): Promise<TemplateOperationResult<TemplateDescriptorLike>>;
  listTemplates(): Promise<TemplateOperationResult<readonly TemplateDescriptorLike[]>>;
  updateTemplate(
    id: string,
    updates: Partial<TemplateDraftLike>,
  ): Promise<TemplateOperationResult<TemplateDescriptorLike>>;
  deleteTemplate(id: string): Promise<TemplateOperationResult<void>>;
  getComplianceReport(sessionId: string): Promise<TemplateOperationResult<ComplianceReportLike>>;
}

export interface PersonaDraftLike {
  readonly name: string;
  readonly tone: string;
  readonly audience: string;
  readonly toggles?: Record<string, unknown>;
  readonly source?: string;
}

export interface PersonaDefinitionLike extends PersonaDraftLike {
  readonly id: string;
  readonly metadata: {
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly source?: string;
  };
}

export interface PersonaOperationError {
  readonly code?: string;
  readonly message: string;
  readonly recoverable?: boolean;
}

export type PersonaOperationResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: PersonaOperationError };

export interface ValidationResultLike {
  readonly compatible: boolean;
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
}

export interface PersonaManagerLike {
  upsertPersona(persona: PersonaDraftLike): Promise<PersonaOperationResult<PersonaDefinitionLike>>;
  getPersona(id: string): Promise<PersonaOperationResult<PersonaDefinitionLike>>;
  listPersonas(): Promise<PersonaOperationResult<readonly PersonaDefinitionLike[]>>;
  deletePersona(id: string): Promise<PersonaOperationResult<void>>;
  validatePersonaTemplateCompatibility(
    personaId: string,
    templateId: string,
  ): Promise<PersonaOperationResult<ValidationResultLike>>;
}

/**
 * Minimal orchestrator-like interface used by the extension.
 * We avoid importing the full type from @ai-writer/base here to keep package boundaries
 * and prevent TypeScript rootDir issues in isolated tsconfig builds.
 */
export interface OrchestratorLike {
  startOutlineCycle(input: { idea: string; personaId?: string; templateId?: string; historyDepth: number }): Promise<{
    kind: 'ok' | 'err';
    value?: { sessionId: string };
    error?: { message: string };
  }>;
  startDraftCycle(input: { outlineId: string; personaId?: string; templateId?: string }): Promise<{
    kind: 'ok' | 'err';
    value?: { sessionId: string };
    error?: { message: string };
  }>;
  applyTemplatePoint?(sessionId: string, pointId: string, override?: unknown): Promise<unknown>;
  getSession?(sessionId: string): Promise<unknown>;
  resumeSession?(sessionId: string, step: unknown): Promise<unknown>;
}

export interface ExtensionServices {
  readonly sessionManager: SessionManager;
  readonly templateRegistry?: TemplateRegistryLike;
  readonly personaManager?: PersonaManagerLike;
  readonly progressPanel: ProgressPanelProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly sidebarProvider?: any; // SidebarWebviewProvider
  readonly refreshSessions: () => void;
  readonly refreshTemplates: () => void;
  readonly refreshPersonas: () => void;
  readonly openTemplateDetail: (templateId: string) => void;
  readonly statusBar: vscode.StatusBarItem;
}

/**
 * Command result
 */
export type CommandResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: string }
  | { kind: 'cancelled' };

/**
 * Command handler context
 */
export interface CommandContext {
  readonly extensionContext: vscode.ExtensionContext;
  readonly outputChannel: vscode.OutputChannel;
  readonly orchestrator?: OrchestratorLike;
  readonly services?: ExtensionServices;
}

/**
 * Command handler
 */
export type CommandHandler<TInput = void, TOutput = void> = (
  context: CommandContext,
  input: TInput,
) => Promise<CommandResult<TOutput>>;
