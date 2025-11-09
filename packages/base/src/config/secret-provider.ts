export interface SecretProvider {
  getSecret(key: string): Promise<string | undefined>;
}

export interface InMemorySecretProvider extends SecretProvider {
  setSecret(key: string, value: string | undefined): void;
}

export function createInMemorySecretProvider(initial: Record<string, string | undefined> = {}): InMemorySecretProvider {
  const secrets = new Map<string, string | undefined>(Object.entries(initial));

  return {
    async getSecret(key: string): Promise<string | undefined> {
      return secrets.get(key);
    },
    setSecret(key: string, value: string | undefined): void {
      if (typeof value === 'undefined') {
        secrets.delete(key);
        return;
      }
      secrets.set(key, value);
    },
  };
}
