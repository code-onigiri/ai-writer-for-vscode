import { createOpenAI } from '@ai-sdk/openai';
import type { ProviderChannel } from '../aisdk-hub.js';
import type { ConfigurationService } from '../../config/index.js';

/**
 * OpenAI channel options
 */
export interface OpenAIChannelOptions {
  configService: ConfigurationService;
  modelId?: string;
  baseURL?: string;
}

/**
 * Creates an OpenAI provider channel
 * Note: This function should be called after configuration is ready
 */
export async function createOpenAIChannel(options: OpenAIChannelOptions): Promise<ProviderChannel> {
  const { configService, modelId = 'gpt-4o-mini', baseURL } = options;

  // Check configuration upfront
  const config = await configService.getProviderConfig('openai');
  const apiKey = config.values.apiKey;
  const isConfigured = config.isConfigured;

  // Create provider if configured
  let provider: ReturnType<typeof createOpenAI> | null = null;
  if (isConfigured && apiKey) {
    provider = createOpenAI({
      apiKey,
      baseURL,
    });
  }

  return {
    key: 'openai',
    get model() {
      if (!provider) {
        // Return a dummy provider for unconfigured state
        // The hub will check isConfigured before using the model
        provider = createOpenAI({ apiKey: '' });
      }
      return provider(modelId);
    },
    isConfigured: () => isConfigured,
  };
}
