import * as vscode from 'vscode';

/**
 * AI Writer Language Model Tools
 * Provides tools that can be invoked by language models
 */

export interface ToolInvocationOptions {
  input: Record<string, unknown>;
  context: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>;
}

export interface ToolResult {
  content: vscode.LanguageModelToolResult[];
}

/**
 * Template Compliance Check Tool
 * Checks if content complies with a template
 */
export class TemplateComplianceTool implements vscode.LanguageModelTool<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { templateId, content } = options.input as { templateId?: string; content?: string };

    if (!templateId || !content) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('Error: templateId and content are required'),
      ]);
    }

    // Simulate template compliance check
    // In real implementation, this would check against actual template points
    const complianceReport = {
      templateId,
      compliant: true,
      checkedPoints: 3,
      passedPoints: 3,
      details: [
        { point: 'Introduction', compliant: true, notes: 'Good opening' },
        { point: 'Main Content', compliant: true, notes: 'Well structured' },
        { point: 'Conclusion', compliant: true, notes: 'Strong closing' },
      ],
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(complianceReport, null, 2)),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async prepareInvocation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Checking template compliance...',
    };
  }
}

/**
 * Get Template Tool
 * Retrieves template information
 */
export class GetTemplateTool implements vscode.LanguageModelTool<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { templateId } = options.input as { templateId?: string };

    if (!templateId) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('Error: templateId is required'),
      ]);
    }

    // Simulate template retrieval
    // In real implementation, this would fetch from template registry
    const template = {
      id: templateId,
      name: 'Sample Template',
      points: [
        {
          id: 'intro',
          title: 'Introduction',
          instructions: 'Write an engaging introduction',
          priority: 10,
        },
        {
          id: 'body',
          title: 'Main Content',
          instructions: 'Provide detailed information',
          priority: 20,
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          instructions: 'Summarize key points',
          priority: 30,
        },
      ],
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(template, null, 2)),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async prepareInvocation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Retrieving template...',
    };
  }
}

/**
 * Get Persona Tool
 * Retrieves persona information
 */
export class GetPersonaTool implements vscode.LanguageModelTool<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { personaId } = options.input as { personaId?: string };

    if (!personaId) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('Error: personaId is required'),
      ]);
    }

    // Simulate persona retrieval
    // In real implementation, this would fetch from persona manager
    const persona = {
      id: personaId,
      name: 'Professional Writer',
      tone: 'professional',
      audience: 'developers',
      toggles: {
        include_examples: true,
        technical_depth: true,
      },
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(persona, null, 2)),
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async prepareInvocation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, unknown>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Retrieving persona...',
    };
  }
}

/**
 * Tool Manager
 * Manages registration and lifecycle of language model tools
 */
export class LanguageModelToolManager {
  private registeredTools: vscode.Disposable[] = [];
  private tools = new Map<string, vscode.LanguageModelTool<Record<string, unknown>>>();

  constructor() {
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools.set('aiWriter_checkTemplateCompliance', new TemplateComplianceTool());
    this.tools.set('aiWriter_getTemplate', new GetTemplateTool());
    this.tools.set('aiWriter_getPersona', new GetPersonaTool());
  }

  /**
   * Register all tools with VSCode
   */
  public registerTools(): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Check if Language Model Tools API is available
    if (typeof vscode.lm === 'undefined' || typeof vscode.lm.registerTool === 'undefined') {
      console.log('Language Model Tools API not available');
      return disposables;
    }

    for (const [name, tool] of this.tools.entries()) {
      try {
        const disposable = vscode.lm.registerTool(name, tool);
        disposables.push(disposable);
        this.registeredTools.push(disposable);
        console.log(`Registered tool: ${name}`);
      } catch (error) {
        console.error(`Failed to register tool ${name}:`, error);
      }
    }

    return disposables;
  }

  /**
   * Get tool by name
   */
  public getTool(name: string): vscode.LanguageModelTool<Record<string, unknown>> | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tool names
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Dispose all registered tools
   */
  public dispose(): void {
    for (const disposable of this.registeredTools) {
      disposable.dispose();
    }
    this.registeredTools = [];
  }
}

/**
 * Tool descriptions for documentation and discovery
 */
export const TOOL_DESCRIPTIONS = {
  aiWriter_checkTemplateCompliance: {
    name: 'aiWriter_checkTemplateCompliance',
    description: 'Check if content complies with a template',
    parameters: {
      templateId: {
        type: 'string',
        description: 'ID of the template to check against',
        required: true,
      },
      content: {
        type: 'string',
        description: 'Content to check for compliance',
        required: true,
      },
    },
  },
  aiWriter_getTemplate: {
    name: 'aiWriter_getTemplate',
    description: 'Retrieve template information including all points and instructions',
    parameters: {
      templateId: {
        type: 'string',
        description: 'ID of the template to retrieve',
        required: true,
      },
    },
  },
  aiWriter_getPersona: {
    name: 'aiWriter_getPersona',
    description: 'Retrieve persona information including tone, audience, and toggles',
    parameters: {
      personaId: {
        type: 'string',
        description: 'ID of the persona to retrieve',
        required: true,
      },
    },
  },
};
