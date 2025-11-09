export type ProviderKey = 'openai' | 'geminiApi' | 'geminiCli' | 'lmtBridge';

export type ConfigurationSource = 'secret-storage' | 'environment' | 'unset';

export interface ProviderFieldDefinition {
  readonly field: string;
  readonly secretKey: string;
  readonly envKey: string;
  readonly required: boolean;
  readonly description: string;
}

export interface ResolvedProviderField {
  readonly field: string;
  readonly value?: string;
  readonly source: ConfigurationSource;
}

export interface ProviderConfiguration {
  readonly key: ProviderKey;
  readonly values: Record<string, string | undefined>;
  readonly sources: Record<string, ConfigurationSource>;
  readonly missing: string[];
  readonly isConfigured: boolean;
}
