import { promises as fs } from 'fs';
import * as path from 'path';
import type { SessionSnapshot } from '../orchestration/types.js';
import type { TemplateDescriptor } from '../template/types.js';
import type { PersonaDefinition } from '../persona/types.js';
import type { DraftCommitInput, StorageFault, StoragePathConfig, StorageResult } from './types.js';

/**
 * Storage Gateway interface
 */
export interface StorageGateway {
  saveSession(session: SessionSnapshot): Promise<StorageResult<string>>;
  loadSession(id: string): Promise<StorageResult<SessionSnapshot>>;
  listSessions(): Promise<StorageResult<readonly string[]>>;
  deleteSession(id: string): Promise<StorageResult<void>>;
  
  saveTemplate(template: TemplateDescriptor): Promise<StorageResult<string>>;
  loadTemplate(id: string): Promise<StorageResult<TemplateDescriptor>>;
  listTemplates(): Promise<StorageResult<readonly string[]>>;
  
  savePersona(persona: PersonaDefinition): Promise<StorageResult<string>>;
  loadPersona(id: string): Promise<StorageResult<PersonaDefinition>>;
  listPersonas(): Promise<StorageResult<readonly string[]>>;
  
  commitDraft(commitInput: DraftCommitInput): Promise<StorageResult<string>>;
}

/**
 * Storage Gateway Options
 */
export interface StorageGatewayOptions {
  pathConfig: StoragePathConfig;
}

/**
 * Creates a Storage Gateway instance
 */
export function createStorageGateway(options: StorageGatewayOptions): StorageGateway {
  const { pathConfig } = options;

  return {
    saveSession: async (session: SessionSnapshot) => {
      return saveSessionImpl(session, pathConfig);
    },
    loadSession: async (id: string) => {
      return loadSessionImpl(id, pathConfig);
    },
    listSessions: async () => {
      return listItemsImpl(pathConfig.sessionsDir);
    },
    deleteSession: async (id: string) => {
      return deleteItemImpl(id, pathConfig.sessionsDir);
    },
    saveTemplate: async (template: TemplateDescriptor) => {
      return saveTemplateImpl(template, pathConfig);
    },
    loadTemplate: async (id: string) => {
      return loadTemplateImpl(id, pathConfig);
    },
    listTemplates: async () => {
      return listItemsImpl(pathConfig.templatesDir);
    },
    savePersona: async (persona: PersonaDefinition) => {
      return savePersonaImpl(persona, pathConfig);
    },
    loadPersona: async (id: string) => {
      return loadPersonaImpl(id, pathConfig);
    },
    listPersonas: async () => {
      return listItemsImpl(pathConfig.personasDir);
    },
    commitDraft: async (commitInput: DraftCommitInput) => {
      return commitDraftImpl(commitInput, pathConfig);
    },
  };
}

/**
 * Implementation of saveSession
 */
async function saveSessionImpl(
  session: SessionSnapshot,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<string>> {
  try {
    await ensureDirectory(pathConfig.sessionsDir);
    
    const filePath = path.join(pathConfig.sessionsDir, `${session.id}.json`);
    const content = JSON.stringify(session, null, 2);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return { kind: 'ok', value: filePath };
  } catch (error) {
    return {
      kind: 'err',
      error: createStorageFault(
        'write_error',
        `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
        true,
        pathConfig.sessionsDir,
      ),
    };
  }
}

/**
 * Implementation of loadSession
 */
async function loadSessionImpl(
  id: string,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<SessionSnapshot>> {
  try {
    const filePath = path.join(pathConfig.sessionsDir, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const session = JSON.parse(content) as SessionSnapshot;
    
    return { kind: 'ok', value: session };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        kind: 'err',
        error: createStorageFault('file_not_found', `Session ${id} not found`, false, id),
      };
    }
    
    return {
      kind: 'err',
      error: createStorageFault(
        'read_error',
        `Failed to load session: ${error instanceof Error ? error.message : String(error)}`,
        true,
        id,
      ),
    };
  }
}

/**
 * Implementation of saveTemplate
 */
async function saveTemplateImpl(
  template: TemplateDescriptor,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<string>> {
  try {
    await ensureDirectory(pathConfig.templatesDir);
    
    const filePath = path.join(pathConfig.templatesDir, `${template.id}.json`);
    const content = JSON.stringify(template, null, 2);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return { kind: 'ok', value: filePath };
  } catch (error) {
    return {
      kind: 'err',
      error: createStorageFault(
        'write_error',
        `Failed to save template: ${error instanceof Error ? error.message : String(error)}`,
        true,
        pathConfig.templatesDir,
      ),
    };
  }
}

/**
 * Implementation of loadTemplate
 */
async function loadTemplateImpl(
  id: string,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<TemplateDescriptor>> {
  try {
    const filePath = path.join(pathConfig.templatesDir, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const template = JSON.parse(content) as TemplateDescriptor;
    
    return { kind: 'ok', value: template };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        kind: 'err',
        error: createStorageFault('file_not_found', `Template ${id} not found`, false, id),
      };
    }
    
    return {
      kind: 'err',
      error: createStorageFault(
        'read_error',
        `Failed to load template: ${error instanceof Error ? error.message : String(error)}`,
        true,
        id,
      ),
    };
  }
}

/**
 * Implementation of savePersona
 */
async function savePersonaImpl(
  persona: PersonaDefinition,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<string>> {
  try {
    await ensureDirectory(pathConfig.personasDir);
    
    const filePath = path.join(pathConfig.personasDir, `${persona.id}.json`);
    const content = JSON.stringify(persona, null, 2);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return { kind: 'ok', value: filePath };
  } catch (error) {
    return {
      kind: 'err',
      error: createStorageFault(
        'write_error',
        `Failed to save persona: ${error instanceof Error ? error.message : String(error)}`,
        true,
        pathConfig.personasDir,
      ),
    };
  }
}

/**
 * Implementation of loadPersona
 */
async function loadPersonaImpl(
  id: string,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<PersonaDefinition>> {
  try {
    const filePath = path.join(pathConfig.personasDir, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const persona = JSON.parse(content) as PersonaDefinition;
    
    return { kind: 'ok', value: persona };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        kind: 'err',
        error: createStorageFault('file_not_found', `Persona ${id} not found`, false, id),
      };
    }
    
    return {
      kind: 'err',
      error: createStorageFault(
        'read_error',
        `Failed to load persona: ${error instanceof Error ? error.message : String(error)}`,
        true,
        id,
      ),
    };
  }
}

/**
 * Implementation of commitDraft
 */
async function commitDraftImpl(
  commitInput: DraftCommitInput,
  pathConfig: StoragePathConfig,
): Promise<StorageResult<string>> {
  try {
    await ensureDirectory(pathConfig.baseDir);
    
    // Save draft content to a file
    const draftPath = path.join(pathConfig.baseDir, 'drafts', `${commitInput.sessionId}.md`);
    await ensureDirectory(path.dirname(draftPath));
    await fs.writeFile(draftPath, commitInput.content, 'utf-8');
    
    // TODO: Implement Git integration in future
    // For now, just save the content
    
    return { kind: 'ok', value: draftPath };
  } catch (error) {
    return {
      kind: 'err',
      error: createStorageFault(
        'write_error',
        `Failed to commit draft: ${error instanceof Error ? error.message : String(error)}`,
        true,
        pathConfig.baseDir,
      ),
    };
  }
}

/**
 * Implementation of deleteItem
 */
async function deleteItemImpl(id: string, directory: string): Promise<StorageResult<void>> {
  try {
    const filePath = path.join(directory, `${id}.json`);
    await fs.unlink(filePath);
    
    return { kind: 'ok', value: undefined };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        kind: 'err',
        error: createStorageFault('file_not_found', `Item ${id} not found`, false, id),
      };
    }
    
    return {
      kind: 'err',
      error: createStorageFault(
        'write_error',
        `Failed to delete item: ${error instanceof Error ? error.message : String(error)}`,
        true,
        id,
      ),
    };
  }
}

/**
 * Implementation of listItems
 */
async function listItemsImpl(directory: string): Promise<StorageResult<readonly string[]>> {
  try {
    await ensureDirectory(directory);
    
    const files = await fs.readdir(directory);
    const jsonFiles = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
    
    return { kind: 'ok', value: jsonFiles };
  } catch (error) {
    return {
      kind: 'err',
      error: createStorageFault(
        'read_error',
        `Failed to list items: ${error instanceof Error ? error.message : String(error)}`,
        true,
        directory,
      ),
    };
  }
}

/**
 * Helper functions
 */
async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Ignore error if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

function createStorageFault(
  code: StorageFault['code'],
  message: string,
  recoverable: boolean,
  pathOrId?: string,
  details?: Record<string, unknown>,
): StorageFault {
  return {
    code,
    message,
    recoverable,
    path: pathOrId,
    details,
  };
}
