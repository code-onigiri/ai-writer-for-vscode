import { describe, expect, it } from 'vitest';
import { ConfigurationService, createInMemorySecretProvider, knownProviderKeys, } from '@ai-writer/base/config';
describe('ConfigurationService', () => {
    it('prefers secret storage values over environment variables', async () => {
        const secretProvider = createInMemorySecretProvider({
            'ai-writer.providers.openai.apiKey': 'secret-key',
        });
        const service = new ConfigurationService({
            secretProvider,
            environment: {
                OPENAI_API_KEY: 'env-key',
            },
        });
        const config = await service.getProviderConfig('openai');
        expect(config.values.apiKey).toBe('secret-key');
        expect(config.sources.apiKey).toBe('secret-storage');
    });
    it('falls back to environment variables when secrets are absent', async () => {
        const service = new ConfigurationService({
            secretProvider: createInMemorySecretProvider({}),
            environment: {
                GOOGLE_API_KEY: 'env-google',
            },
        });
        const config = await service.getProviderConfig('geminiApi');
        expect(config.values.apiKey).toBe('env-google');
        expect(config.sources.apiKey).toBe('environment');
    });
    it('reports missing required entries when nothing is configured', async () => {
        const service = new ConfigurationService({
            secretProvider: createInMemorySecretProvider({}),
        });
        const config = await service.getProviderConfig('lmtBridge');
        expect(config.values.accessToken).toBeUndefined();
        expect(config.missing).toContain('accessToken');
        expect(config.isConfigured).toBe(false);
    });
    it('lists all known provider keys for diagnostics', () => {
        expect(knownProviderKeys()).toEqual(['openai', 'geminiApi', 'geminiCli', 'lmtBridge']);
    });
});
//# sourceMappingURL=configuration-service.test.js.map