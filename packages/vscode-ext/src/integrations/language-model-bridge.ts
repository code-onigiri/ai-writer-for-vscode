import * as vscode from 'vscode';

/**
 * Bridge to VSCode's Language Model API
 * Provides access to language models available in VSCode
 */
export class LanguageModelBridge {
  private static instance: LanguageModelBridge | undefined;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): LanguageModelBridge {
    if (!LanguageModelBridge.instance) {
      LanguageModelBridge.instance = new LanguageModelBridge();
    }
    return LanguageModelBridge.instance;
  }

  /**
   * Check if Language Model API is available
   */
  public isAvailable(): boolean {
    return typeof vscode.lm !== 'undefined' && typeof vscode.lm.selectChatModels === 'function';
  }

  /**
   * Get available language models
   */
  public async getAvailableModels(): Promise<vscode.LanguageModelChat[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const models = await vscode.lm.selectChatModels();
      return models;
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Get a specific model by family or vendor
   */
  public async getModel(options?: {
    vendor?: string;
    family?: string;
    version?: string;
  }): Promise<vscode.LanguageModelChat | undefined> {
    if (!this.isAvailable()) {
      return undefined;
    }

    try {
      const models = await vscode.lm.selectChatModels(options);
      return models.length > 0 ? models[0] : undefined;
    } catch (error) {
      console.error('Failed to get model:', error);
      return undefined;
    }
  }

  /**
   * Send a chat request to a language model
   */
  public async sendRequest(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage[],
    options?: {
      justification?: string;
      cancellationToken?: vscode.CancellationToken;
      onProgress?: (chunk: string) => void;
    }
  ): Promise<string> {
    try {
      const requestOptions: vscode.LanguageModelChatRequestOptions = {
        justification: options?.justification || 'AI Writer content generation',
      };

      const response = await model.sendRequest(
        messages,
        requestOptions,
        options?.cancellationToken
      );

      let fullResponse = '';

      for await (const chunk of response.text) {
        fullResponse += chunk;
        if (options?.onProgress) {
          options.onProgress(chunk);
        }
      }

      return fullResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Language model request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Send a streaming request to a language model
   */
  public async *sendStreamingRequest(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage[],
    options?: {
      justification?: string;
      cancellationToken?: vscode.CancellationToken;
    }
  ): AsyncGenerator<string, void, undefined> {
    try {
      const requestOptions: vscode.LanguageModelChatRequestOptions = {
        justification: options?.justification || 'AI Writer content generation',
      };

      const response = await model.sendRequest(
        messages,
        requestOptions,
        options?.cancellationToken
      );

      for await (const chunk of response.text) {
        yield chunk;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Language model streaming request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a user message
   */
  public createUserMessage(content: string): vscode.LanguageModelChatMessage {
    return vscode.LanguageModelChatMessage.User(content);
  }

  /**
   * Create an assistant message
   */
  public createAssistantMessage(content: string): vscode.LanguageModelChatMessage {
    return vscode.LanguageModelChatMessage.Assistant(content);
  }

  /**
   * Count tokens in a message (approximate)
   */
  public async countTokens(
    model: vscode.LanguageModelChat,
    messages: vscode.LanguageModelChatMessage | vscode.LanguageModelChatMessage[] | string
  ): Promise<number> {
    try {
      let messagesToCount: string | vscode.LanguageModelChatMessage;
      
      if (Array.isArray(messages)) {
        // For array, use the first message or convert to string
        messagesToCount = messages.length > 0 ? messages[0] : '';
      } else if (typeof messages === 'string') {
        messagesToCount = messages;
      } else {
        messagesToCount = messages;
      }

      return await model.countTokens(messagesToCount);
    } catch (error) {
      console.error('Failed to count tokens:', error);
      return 0;
    }
  }

  /**
   * Get model information
   */
  public getModelInfo(model: vscode.LanguageModelChat): {
    id: string;
    vendor: string;
    family: string;
    version: string;
    name: string;
    maxInputTokens: number;
  } {
    return {
      id: model.id,
      vendor: model.vendor,
      family: model.family,
      version: model.version,
      name: model.name,
      maxInputTokens: model.maxInputTokens,
    };
  }
}

/**
 * Provider for Language Model Chat functionality
 * Integrates with VSCode's Language Model API
 */
export class LanguageModelChatProvider {
  private bridge: LanguageModelBridge;
  private currentModel: vscode.LanguageModelChat | undefined;

  constructor() {
    this.bridge = LanguageModelBridge.getInstance();
  }

  /**
   * Check if the provider is available
   */
  public async isAvailable(): Promise<boolean> {
    return this.bridge.isAvailable();
  }

  /**
   * Initialize with a specific model
   */
  public async initialize(options?: {
    vendor?: string;
    family?: string;
    version?: string;
  }): Promise<boolean> {
    if (!this.bridge.isAvailable()) {
      return false;
    }

    const model = await this.bridge.getModel(options);
    if (model) {
      this.currentModel = model;
      return true;
    }

    return false;
  }

  /**
   * Get current model information
   */
  public getCurrentModelInfo(): {
    id: string;
    vendor: string;
    family: string;
    version: string;
    name: string;
    maxInputTokens: number;
  } | undefined {
    if (!this.currentModel) {
      return undefined;
    }
    return this.bridge.getModelInfo(this.currentModel);
  }

  /**
   * Generate content using the current model
   */
  public async generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      justification?: string;
      cancellationToken?: vscode.CancellationToken;
      onProgress?: (chunk: string) => void;
    }
  ): Promise<string> {
    if (!this.currentModel) {
      throw new Error('Language model not initialized');
    }

    const messages: vscode.LanguageModelChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push(this.bridge.createAssistantMessage(options.systemPrompt));
    }

    messages.push(this.bridge.createUserMessage(prompt));

    return await this.bridge.sendRequest(this.currentModel, messages, {
      justification: options?.justification,
      cancellationToken: options?.cancellationToken,
      onProgress: options?.onProgress,
    });
  }

  /**
   * Generate content with streaming
   */
  public async *generateStreaming(
    prompt: string,
    options?: {
      systemPrompt?: string;
      justification?: string;
      cancellationToken?: vscode.CancellationToken;
    }
  ): AsyncGenerator<string, void, undefined> {
    if (!this.currentModel) {
      throw new Error('Language model not initialized');
    }

    const messages: vscode.LanguageModelChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push(this.bridge.createAssistantMessage(options.systemPrompt));
    }

    messages.push(this.bridge.createUserMessage(prompt));

    yield* this.bridge.sendStreamingRequest(this.currentModel, messages, {
      justification: options?.justification,
      cancellationToken: options?.cancellationToken,
    });
  }

  /**
   * Generate with conversation history
   */
  public async generateWithHistory(
    messages: { role: 'user' | 'assistant'; content: string }[],
    options?: {
      justification?: string;
      cancellationToken?: vscode.CancellationToken;
      onProgress?: (chunk: string) => void;
    }
  ): Promise<string> {
    if (!this.currentModel) {
      throw new Error('Language model not initialized');
    }

    const chatMessages = messages.map((msg) =>
      msg.role === 'user'
        ? this.bridge.createUserMessage(msg.content)
        : this.bridge.createAssistantMessage(msg.content)
    );

    return await this.bridge.sendRequest(this.currentModel, chatMessages, {
      justification: options?.justification,
      cancellationToken: options?.cancellationToken,
      onProgress: options?.onProgress,
    });
  }

  /**
   * Count tokens for a prompt
   */
  public async countTokens(prompt: string): Promise<number> {
    if (!this.currentModel) {
      return 0;
    }

    return await this.bridge.countTokens(this.currentModel, prompt);
  }
}
