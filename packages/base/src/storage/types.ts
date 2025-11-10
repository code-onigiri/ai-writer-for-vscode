/**
 * Storage fault codes
 */
export type StorageFaultCode =
  | 'file_not_found'
  | 'write_error'
  | 'read_error'
  | 'conflict_detected'
  | 'invalid_path'
  | 'permission_denied';

/**
 * Storage fault
 */
export interface StorageFault {
  readonly code: StorageFaultCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly path?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type for storage operations
 */
export type StorageResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: StorageFault };

/**
 * Draft commit input
 */
export interface DraftCommitInput {
  readonly sessionId: string;
  readonly message: string;
  readonly author?: string;
  readonly content: string;
}

/**
 * Version metadata for stored items
 */
export interface VersionMetadata {
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly checksum?: string;
}

/**
 * Versioned storage item
 */
export interface VersionedItem<T> {
  readonly data: T;
  readonly metadata: VersionMetadata;
}

/**
 * Storage statistics
 */
export interface StorageStatistics {
  readonly totalSessions: number;
  readonly totalTemplates: number;
  readonly totalPersonas: number;
  readonly storageSize: number; // bytes
  readonly lastUpdated: string;
}

/**
 * Storage path configuration
 */
export interface StoragePathConfig {
  readonly baseDir: string;
  readonly sessionsDir: string;
  readonly templatesDir: string;
  readonly personasDir: string;
  readonly logsDir: string;
  readonly versionsDir?: string;
}
