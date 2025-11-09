import {
  ConfigurationService,
  type ConfigurationServiceOptions,
  type SecretProvider,
} from '@ai-writer/base/config';

import type { ExtensionContext } from 'vscode';

export interface ConfigurationBridgeOptions {
  environment?: Record<string, string | undefined>;
  secretProvider?: SecretProvider;
}

export function createConfigurationServiceBridge(
  context: ExtensionContext,
  options: ConfigurationBridgeOptions = {},
): ConfigurationService {
  const secretProvider: SecretProvider = options.secretProvider ?? {
    async getSecret(key: string) {
      return context.secrets.get(key);
    },
  };

  const configurationOptions: ConfigurationServiceOptions = {
    secretProvider,
    environment: options.environment ?? process.env,
  };

  return new ConfigurationService(configurationOptions);
}
