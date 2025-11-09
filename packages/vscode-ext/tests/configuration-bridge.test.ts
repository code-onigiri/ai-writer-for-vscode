import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  SecretStorage: class {},
}));

import type { ExtensionContext } from 'vscode';

import { createConfigurationServiceBridge } from '@ai-writer/vscode-ext/configuration/config-bridge';

describe('createConfigurationServiceBridge', () => {
  it('provides ConfigurationService wired to VS Code SecretStorage', async () => {
    const secrets = new Map<string, string | undefined>([
      ['ai-writer.providers.openai.apiKey', 'secret-from-vscode'],
    ]);
    const getSecret = vi.fn((key: string) => Promise.resolve(secrets.get(key)));
    const context: ExtensionContext = {
      secrets: {
        get: getSecret,
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(),
      },
      subscriptions: [],
    } as unknown as ExtensionContext;

    const bridge = createConfigurationServiceBridge(context, {
      environment: {},
    });

    const config = await bridge.getProviderConfig('openai');
    expect(config.values.apiKey).toBe('secret-from-vscode');
    expect(getSecret).toHaveBeenCalledWith('ai-writer.providers.openai.apiKey');
  });

  it('falls back to custom environment passed for tests', async () => {
    const context: ExtensionContext = {
      secrets: {
        get: vi.fn(() => Promise.resolve(undefined)),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(),
      },
      subscriptions: [],
    } as unknown as ExtensionContext;

    const bridge = createConfigurationServiceBridge(context, {
      environment: { GEMINI_CLI_PATH: '/usr/local/bin/gemini' },
    });

    const config = await bridge.getProviderConfig('gemini-cli');
    expect(config.values.cliPath).toBe('/usr/local/bin/gemini');
  });
});
