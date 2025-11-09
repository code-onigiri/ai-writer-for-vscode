import { generateText, streamText, type LanguageModel } from 'ai';

import type {
  ProviderChannelKey,
  ProviderFault,
  ProviderPayload,
  ProviderRequest,
  ProviderResponse,
  ProviderResult,
  ProviderStatistics,
  ProviderStream,
  ProviderStreamChunk,
  TemplateContext,
} from './types.js';

/**
 * Provider channel definition
 */
export interface ProviderChannel {
  readonly key: ProviderChannelKey;
  readonly model: LanguageModel;
  readonly isConfigured: () => boolean;
}

/**
 * AISDK Hub Options
 */
export interface AISDKHubOptions {
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  timeout?: number;
}

/**
 * AISDK Hub interface
 */
export interface AISDKHub {
  registerProvider(channel: ProviderChannel): void;
  execute(request: ProviderRequest): Promise<ProviderResult<ProviderResponse>>;
  stream(request: ProviderRequest): Promise<ProviderResult<ProviderStream>>;
  getStatistics(key?: ProviderChannelKey): ProviderStatistics[];
  isConfigured(key: ProviderChannelKey): boolean;
}

/**
 * Provider registry
 */
type ProviderRegistry = Record<string, ProviderChannel>;

/**
 * Request statistics
 */
interface RequestStats {
  requestCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  totalTokens: number;
}

/**
 * Statistics storage
 */
type StatisticsStore = Record<string, RequestStats>;

/**
 * Creates an AISDK Hub instance
 */
export function createAISDKHub(options: AISDKHubOptions = {}): AISDKHub {
  const providers: ProviderRegistry = {};
  const statistics: StatisticsStore = {};

  const defaultMaxTokens = options.defaultMaxTokens ?? 2000;
  const defaultTemperature = options.defaultTemperature ?? 0.7;
  const timeout = options.timeout ?? 60000;

  return {
    registerProvider: (channel: ProviderChannel) => {
      registerProviderImpl(channel, providers, statistics);
    },
    execute: async (request: ProviderRequest) => {
      return executeImpl(request, providers, statistics, defaultMaxTokens, defaultTemperature, timeout);
    },
    stream: async (request: ProviderRequest) => {
      return streamImpl(request, providers, statistics, defaultMaxTokens, defaultTemperature, timeout);
    },
    getStatistics: (key?: ProviderChannelKey) => {
      return getStatisticsImpl(key, providers, statistics);
    },
    isConfigured: (key: ProviderChannelKey) => {
      return isConfiguredImpl(key, providers);
    },
  };
}

/**
 * Implementation of registerProvider
 */
function registerProviderImpl(
  channel: ProviderChannel,
  providers: ProviderRegistry,
  statistics: StatisticsStore,
): void {
  providers[channel.key] = channel;

  // Initialize statistics if not present
  if (!statistics[channel.key]) {
    statistics[channel.key] = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      totalTokens: 0,
    };
  }
}

/**
 * Implementation of execute
 */
async function executeImpl(
  request: ProviderRequest,
  providers: ProviderRegistry,
  statistics: StatisticsStore,
  defaultMaxTokens: number,
  defaultTemperature: number,
  timeout: number,
): Promise<ProviderResult<ProviderResponse>> {
  const startTime = Date.now();

  // Get provider
  const provider = providers[request.key];
  if (!provider) {
    return {
      kind: 'err',
      error: createProviderFault(
        'provider_not_found',
        `Provider "${request.key}" not found`,
        false,
        request.key,
      ),
    };
  }

  // Check if provider is configured
  if (!provider.isConfigured()) {
    return {
      kind: 'err',
      error: createProviderFault(
        'provider_not_configured',
        `Provider "${request.key}" is not properly configured`,
        true,
        request.key,
      ),
    };
  }

  // Update statistics
  const stats = statistics[request.key];
  stats.requestCount++;

  try {
    // Build prompt with template context
    const fullPrompt = buildPromptWithContext(request.payload, request.templateContext);

    // Execute with timeout
    const result = await Promise.race([
      generateText({
        model: provider.model,
        prompt: fullPrompt,
        temperature: request.payload.temperature ?? defaultTemperature,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout),
      ),
    ]);

    // Update statistics
    const duration = Date.now() - startTime;
    stats.successCount++;
    stats.totalDurationMs += duration;
    if (result.usage) {
      stats.totalTokens += result.usage.totalTokens ?? 0;
    }

    // Build response
    const response: ProviderResponse = {
      content: result.text,
      usage: undefined, // TODO: Extract usage from result when API stabilizes
      finishReason: result.finishReason,
    };

    return { kind: 'ok', value: response };
  } catch (error) {
    // Update failure statistics
    stats.failureCount++;
    const duration = Date.now() - startTime;
    stats.totalDurationMs += duration;

    // Determine error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    let code: ProviderFault['code'] = 'provider_error';

    if (errorMessage.includes('timeout')) {
      code = 'timeout';
    } else if (errorMessage.includes('rate limit')) {
      code = 'rate_limit_exceeded';
    } else if (errorMessage.includes('network')) {
      code = 'network_error';
    }

    return {
      kind: 'err',
      error: createProviderFault(code, errorMessage, true, request.key, { originalError: errorMessage }),
    };
  }
}

/**
 * Implementation of stream
 */
async function streamImpl(
  request: ProviderRequest,
  providers: ProviderRegistry,
  statistics: StatisticsStore,
  defaultMaxTokens: number,
  defaultTemperature: number,
  timeout: number,
): Promise<ProviderResult<ProviderStream>> {
  const startTime = Date.now();

  // Get provider
  const provider = providers[request.key];
  if (!provider) {
    return {
      kind: 'err',
      error: createProviderFault(
        'provider_not_found',
        `Provider "${request.key}" not found`,
        false,
        request.key,
      ),
    };
  }

  // Check if provider is configured
  if (!provider.isConfigured()) {
    return {
      kind: 'err',
      error: createProviderFault(
        'provider_not_configured',
        `Provider "${request.key}" is not properly configured`,
        true,
        request.key,
      ),
    };
  }

  // Update statistics
  const stats = statistics[request.key];
  stats.requestCount++;

  try {
    // Build prompt with template context
    const fullPrompt = buildPromptWithContext(request.payload, request.templateContext);

    // Execute streaming with timeout
    const result = await Promise.race([
      streamText({
        model: provider.model,
        prompt: fullPrompt,
        temperature: request.payload.temperature ?? defaultTemperature,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout),
      ),
    ]);

    // Create async iterable for chunks
    const chunks: AsyncIterable<ProviderStreamChunk> = {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const chunk of result.textStream) {
            yield {
              content: chunk,
              done: false,
            };
          }
          // Final chunk
          yield {
            content: '',
            done: true,
          };

          // Update success statistics
          const duration = Date.now() - startTime;
          stats.successCount++;
          stats.totalDurationMs += duration;
        } catch (streamError) {
          // Update failure statistics
          stats.failureCount++;
          const duration = Date.now() - startTime;
          stats.totalDurationMs += duration;
          throw streamError;
        }
      },
    };

    const stream: ProviderStream = { chunks };
    return { kind: 'ok', value: stream };
  } catch (error) {
    // Update failure statistics
    stats.failureCount++;
    const duration = Date.now() - startTime;
    stats.totalDurationMs += duration;

    // Determine error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    let code: ProviderFault['code'] = 'provider_error';

    if (errorMessage.includes('timeout')) {
      code = 'timeout';
    } else if (errorMessage.includes('rate limit')) {
      code = 'rate_limit_exceeded';
    } else if (errorMessage.includes('network')) {
      code = 'network_error';
    }

    return {
      kind: 'err',
      error: createProviderFault(code, errorMessage, true, request.key, { originalError: errorMessage }),
    };
  }
}

/**
 * Implementation of getStatistics
 */
function getStatisticsImpl(
  key: ProviderChannelKey | undefined,
  providers: ProviderRegistry,
  statistics: StatisticsStore,
): ProviderStatistics[] {
  const keys = key ? [key] : Object.keys(providers);

  return keys
    .filter((k) => statistics[k])
    .map((k) => {
      const stats = statistics[k];
      return {
        provider: k as ProviderChannelKey,
        requestCount: stats.requestCount,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        averageDurationMs:
          stats.requestCount > 0 ? stats.totalDurationMs / stats.requestCount : 0,
        totalTokensUsed: stats.totalTokens,
      };
    });
}

/**
 * Implementation of isConfigured
 */
function isConfiguredImpl(key: ProviderChannelKey, providers: ProviderRegistry): boolean {
  const provider = providers[key];
  return provider ? provider.isConfigured() : false;
}

/**
 * Helper functions
 */
function buildPromptWithContext(
  payload: ProviderPayload,
  templateContext?: TemplateContext,
): string {
  let prompt = payload.prompt;

  // Add template context if available
  if (templateContext) {
    if (templateContext.personaId) {
      prompt = `[Persona: ${templateContext.personaId}]\n${prompt}`;
    }

    if (templateContext.templateId) {
      prompt = `[Template: ${templateContext.templateId}]\n${prompt}`;
    }

    if (templateContext.points && templateContext.points.length > 0) {
      const pointsText = templateContext.points
        .map((p) => `- ${p.pointId} (priority ${p.priority}): ${p.instructions}`)
        .join('\n');
      prompt = `${prompt}\n\n[Template Points]\n${pointsText}`;
    }
  }

  // Add mode context
  prompt = `[Mode: ${payload.mode}]\n${prompt}`;

  return prompt;
}

function createProviderFault(
  code: ProviderFault['code'],
  message: string,
  recoverable: boolean,
  provider?: ProviderChannelKey,
  details?: Record<string, unknown>,
): ProviderFault {
  return {
    code,
    message,
    recoverable,
    provider,
    details,
  };
}
