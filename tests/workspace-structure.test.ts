import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

declare global {
  // Node.js 18 defines import.meta.url for ESM modules.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ImportMeta {
    readonly url: string;
  }
}

type WorkspacePackage = {
  name: string;
  dir: string;
};

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages: WorkspacePackage[] = [
  { name: '@ai-writer/base', dir: 'packages/base' },
  { name: '@ai-writer/vscode-ext', dir: 'packages/vscode-ext' },
  { name: '@ai-writer/lmtapi-vscode', dir: 'packages/lmtapi-vscode' },
];

describe('workspace scaffolding', () => {
  it('wires workspace scripts and dev dependencies', async () => {
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const requiredScripts = ['build', 'typecheck', 'lint', 'test', 'test:packages', 'check'] as const;
    for (const scriptName of requiredScripts) {
      expect(packageJson.scripts?.[scriptName], `${scriptName} script missing`).toBeTruthy();
    }

    const requiredDevDeps = ['typescript', 'vitest', 'eslint', '@typescript-eslint/eslint-plugin'];
    for (const dependencyName of requiredDevDeps) {
      expect(
        packageJson.devDependencies?.[dependencyName],
        `${dependencyName} devDependency missing`,
      ).toBeTruthy();
    }
  });

  it('registers packages in pnpm-workspace.yaml', async () => {
    const workspaceFile = path.join(workspaceRoot, 'pnpm-workspace.yaml');
    const yamlDoc = YAML.parse(await fs.readFile(workspaceFile, 'utf8')) as { packages?: string[] };
    expect(yamlDoc.packages, 'packages entry expected').toBeTruthy();
    expect(yamlDoc.packages).toContain('packages/*');
  });

  it('provisions package directories with shared config inheritance', async () => {
    for (const workspacePackage of packages) {
      const packageDir = path.join(workspaceRoot, workspacePackage.dir);
      const packageJsonPath = path.join(packageDir, 'package.json');
      const tsconfigPath = path.join(packageDir, 'tsconfig.json');
      const tsconfigBuildPath = path.join(packageDir, 'tsconfig.build.json');
      const eslintConfigPath = path.join(packageDir, '.eslintrc.cjs');

      const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      expect(pkg.name).toBe(workspacePackage.name);
      const packageScripts = ['build', 'typecheck', 'lint', 'test'];
      for (const scriptName of packageScripts) {
        expect(pkg.scripts?.[scriptName], `${workspacePackage.name} missing ${scriptName}`).toBeTruthy();
      }

      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8')) as { extends?: string };
      expect(tsconfig.extends).toBe('../../tsconfig.base.json');

      const tsconfigBuild = JSON.parse(await fs.readFile(tsconfigBuildPath, 'utf8')) as { extends?: string };
      expect(tsconfigBuild.extends).toBe('./tsconfig.json');

      const eslintConfig = await fs.readFile(eslintConfigPath, 'utf8');
      expect(eslintConfig).toContain("extends: ['../../.eslintrc.base.cjs']");
    }
  });

  it('ships environment template for provider credentials', async () => {
    const envPath = path.join(workspaceRoot, '.env.example');
    const envContent = await fs.readFile(envPath, 'utf8');
    const requiredKeys = ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_CLI_PATH', 'LMTAPI_ACCESS_TOKEN'];
    for (const key of requiredKeys) {
      expect(envContent.includes(`${key}=`), `${key} placeholder missing`).toBe(true);
    }
  });
});
