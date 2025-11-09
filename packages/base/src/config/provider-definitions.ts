import type { ProviderFieldDefinition, ProviderKey } from './types.js';

export const providerFieldDefinitions: Record<ProviderKey, readonly ProviderFieldDefinition[]> = {
  openai: [
    {
      field: 'apiKey',
      secretKey: 'ai-writer.providers.openai.apiKey',
      envKey: 'OPENAI_API_KEY',
      required: true,
      description: 'OpenAI API key used for outline and draft generation.',
    },
  ],
  'gemini-api': [
    {
      field: 'apiKey',
      secretKey: 'ai-writer.providers.google.apiKey',
      envKey: 'GOOGLE_API_KEY',
      required: true,
      description: 'Gemini API key for Google-hosted Gemini endpoints.',
    },
  ],
  'gemini-cli': [
    {
      field: 'cliPath',
      secretKey: 'ai-writer.providers.gemini.cliPath',
      envKey: 'GEMINI_CLI_PATH',
      required: true,
      description: 'Filesystem path to the Gemini CLI executable.',
    },
  ],
  lmtapi: [
    {
      field: 'accessToken',
      secretKey: 'ai-writer.providers.lmt.accessToken',
      envKey: 'LMTAPI_ACCESS_TOKEN',
      required: true,
      description: 'Language Model Tool API access token for VS Code bridge.',
    },
  ],
} as const;

export const providerKeys = Object.freeze(Object.keys(providerFieldDefinitions) as ProviderKey[]);
