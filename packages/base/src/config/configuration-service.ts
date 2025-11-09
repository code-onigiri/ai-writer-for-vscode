import { providerFieldDefinitions, providerKeys } from './provider-definitions.js';

import type { SecretProvider } from './secret-provider.js';
import type {
  ConfigurationSource,
  ProviderConfiguration,
  ProviderFieldDefinition,
  ProviderKey,
} from './types.js';

export interface ConfigurationServiceOptions {
  secretProvider: SecretProvider;
  environment?: Record<string, string | undefined>;
}

export class ConfigurationService {
  private readonly secretProvider: SecretProvider;
  private readonly environment: Record<string, string | undefined>;

  constructor(options: ConfigurationServiceOptions) {
    this.secretProvider = options.secretProvider;
    this.environment = options.environment ?? process.env;
  }

  public async getProviderConfig(providerKey: ProviderKey): Promise<ProviderConfiguration> {
    const definitions = providerFieldDefinitions[providerKey];
    if (!definitions) {
      throw new Error(`Unknown provider key: ${providerKey as string}`);
    }

    const values: Record<string, string | undefined> = {};
    const sources: Record<string, ConfigurationSource> = {};
    const missing: string[] = [];

    for (const definition of definitions) {
      const resolved = await this.resolveField(definition);
      values[definition.field] = resolved.value;
      sources[definition.field] = resolved.source;

      if (!resolved.value && definition.required) {
        missing.push(definition.field);
      }
    }

    return {
      key: providerKey,
      values,
      sources,
      missing,
      isConfigured: missing.length === 0,
    };
  }

  public knownProviders(): ProviderKey[] {
    return [...providerKeys];
  }

  private async resolveField(
    definition: ProviderFieldDefinition,
  ): Promise<{ value?: string; source: ConfigurationSource }> {
    const secretValue = await this.secretProvider.getSecret(definition.secretKey);
    if (isMeaningful(secretValue)) {
      return { value: secretValue, source: 'secret-storage' };
    }

    const envValue = this.environment[definition.envKey];
    if (isMeaningful(envValue)) {
      return { value: envValue, source: 'environment' };
    }

    return { source: 'unset' };
  }
}

export function knownProviderKeys(): ProviderKey[] {
  return [...providerKeys];
}

function isMeaningful(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
