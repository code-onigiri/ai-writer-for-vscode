import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOpenAIChannel, createGeminiChannel } from '../src/provider/channels/index.js';
import type { ConfigurationService } from '../src/config/index.js';

// Mock configuration service
function createMockConfigService(isConfigured: boolean, apiKey?: string): ConfigurationService {
  return {
    getProviderConfig: vi.fn().mockResolvedValue({
      key: 'openai',
      values: { apiKey: apiKey || 'test-key' },
      sources: { apiKey: 'environment' as const },
      missing: isConfigured ? [] : ['apiKey'],
      isConfigured,
    }),
    knownProviders: vi.fn().mockReturnValue(['openai', 'gemini-api']),
  } as unknown as ConfigurationService;
}

describe('Provider Channels', () => {
  describe('OpenAI Channel', () => {
    it('should create OpenAI channel with default model', async () => {
      const configService = createMockConfigService(true);
      const channel = await createOpenAIChannel({ configService });

      expect(channel.key).toBe('openai');
      expect(channel.model).toBeDefined();
    });

    it('should create OpenAI channel with custom model', async () => {
      const configService = createMockConfigService(true);
      const channel = await createOpenAIChannel({
        configService,
        modelId: 'gpt-4',
      });

      expect(channel.key).toBe('openai');
      expect(channel.model).toBeDefined();
    });

    it('should report configured status correctly', async () => {
      const configService = createMockConfigService(true, 'valid-key');
      const channel = await createOpenAIChannel({ configService });

      const isConfigured = channel.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it('should report unconfigured status when API key is missing', async () => {
      const configService = createMockConfigService(false);
      const channel = await createOpenAIChannel({ configService });

      const isConfigured = channel.isConfigured();
      expect(isConfigured).toBe(false);
    });
  });

  describe('Gemini Channel', () => {
    it('should create Gemini channel with default model', async () => {
      const configService = createMockConfigService(true);
      const channel = await createGeminiChannel({ configService });

      expect(channel.key).toBe('gemini-api');
      expect(channel.model).toBeDefined();
    });

    it('should create Gemini channel with custom model', async () => {
      const configService = createMockConfigService(true);
      const channel = await createGeminiChannel({
        configService,
        modelId: 'gemini-1.5-pro',
      });

      expect(channel.key).toBe('gemini-api');
      expect(channel.model).toBeDefined();
    });

    it('should report configured status correctly', async () => {
      const configService = createMockConfigService(true, 'valid-key');
      const channel = await createGeminiChannel({ configService });

      const isConfigured = channel.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it('should report unconfigured status when API key is missing', async () => {
      const configService = createMockConfigService(false);
      const channel = await createGeminiChannel({ configService });

      const isConfigured = channel.isConfigured();
      expect(isConfigured).toBe(false);
    });
  });
});
