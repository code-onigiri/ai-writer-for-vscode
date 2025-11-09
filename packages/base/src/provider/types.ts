/**
 * Provider channel keys
 */
export type ProviderChannelKey = 'openai' | 'gemini-api' | 'gemini-cli' | 'lmtapi';

/**
 * Provider request mode
 */
export type ProviderMode = 'outline' | 'draft' | 'critique' | 'reflection' | 'question';

/**
 * Tool instruction for provider
 */
export interface ToolInstruction {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

/**
 * Template context for provider requests
 */
export interface TemplateContext {
  readonly templateId?: string;
  readonly personaId?: string;
  readonly points?: readonly TemplatePointContext[];
}

/**
 * Template point context
 */
export interface TemplatePointContext {
  readonly pointId: string;
  readonly instructions: string;
  readonly priority: number;
}

/**
 * Provider payload
 */
export interface ProviderPayload {
  readonly prompt: string;
  readonly mode: ProviderMode;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly toolInstructions?: readonly ToolInstruction[];
}

/**
 * Provider request
 */
export interface ProviderRequest {
  readonly key: ProviderChannelKey;
  readonly payload: ProviderPayload;
  readonly templateContext?: TemplateContext;
}

/**
 * Provider response
 */
export interface ProviderResponse {
  readonly content: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly model?: string;
  readonly finishReason?: string;
}

/**
 * Provider stream chunk
 */
export interface ProviderStreamChunk {
  readonly content: string;
  readonly done: boolean;
}

/**
 * Provider stream
 */
export interface ProviderStream {
  readonly chunks: AsyncIterable<ProviderStreamChunk>;
}

/**
 * Provider fault codes
 */
export type ProviderFaultCode =
  | 'provider_not_found'
  | 'provider_not_configured'
  | 'provider_error'
  | 'rate_limit_exceeded'
  | 'invalid_request'
  | 'timeout'
  | 'network_error';

/**
 * Provider fault
 */
export interface ProviderFault {
  readonly code: ProviderFaultCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly provider?: ProviderChannelKey;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type for provider operations
 */
export type ProviderResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: ProviderFault };

/**
 * Provider statistics
 */
export interface ProviderStatistics {
  readonly provider: ProviderChannelKey;
  readonly requestCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly averageDurationMs: number;
  readonly totalTokensUsed: number;
}
