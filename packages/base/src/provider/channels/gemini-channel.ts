import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ProviderChannel } from '../aisdk-hub.js';
import type { ConfigurationService } from '../../config/index.js';

/**
 * Gemini API channel options
 */
export interface GeminiChannelOptions {
  configService: ConfigurationService;
  modelId?: string;
  baseURL?: string;
}

/**
 * Creates a Gemini API provider channel
 * Note: This function should be called after configuration is ready
 */
export async function createGeminiChannel(options: GeminiChannelOptions): Promise<ProviderChannel> {
  const { configService, modelId = 'gemini-1.5-flash', baseURL } = options;

  // Check configuration upfront
  const config = await configService.getProviderConfig('gemini-api');
  const apiKey = config.values.apiKey;
  const isConfigured = config.isConfigured;

  // Create provider if configured
  let provider: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  if (isConfigured && apiKey) {
    provider = createGoogleGenerativeAI({
      apiKey,
      baseURL,
    });
  }

  return {
    key: 'gemini-api',
    get model() {
      if (!provider) {
        // Return a dummy provider for unconfigured state
        // The hub will check isConfigured before using the model
        provider = createGoogleGenerativeAI({ apiKey: '' });
      }
      return provider(modelId);
    },
    isConfigured: () => isConfigured,
  };
}
