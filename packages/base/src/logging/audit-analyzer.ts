import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: string;
}

/**
 * Aggregated statistics from audit logs
 */
export interface AuditStatistics {
  readonly totalEvents: number;
  readonly eventsByType: Record<string, number>;
  readonly timeRange: {
    readonly start: string;
    readonly end: string;
  };
  readonly providerStats?: {
    readonly totalRequests: number;
    readonly successRate: number;
    readonly averageDuration: number;
    readonly requestsByProvider: Record<string, number>;
  };
}

/**
 * Audit analyzer options
 */
export interface AuditAnalyzerOptions {
  readonly directory: string;
}

/**
 * Audit analyzer interface
 */
export interface AuditAnalyzer {
  analyze(startDate?: Date, endDate?: Date): Promise<AuditStatistics>;
  getRecentEvents(limit: number): Promise<readonly AuditLogEntry[]>;
}

/**
 * Creates an Audit Analyzer instance
 */
export function createAuditAnalyzer(options: AuditAnalyzerOptions): AuditAnalyzer {
  return {
    analyze: async (startDate?: Date, endDate?: Date) => {
      return analyzeImpl(options.directory, startDate, endDate);
    },
    getRecentEvents: async (limit: number) => {
      return getRecentEventsImpl(options.directory, limit);
    },
  };
}

/**
 * Implementation of analyze
 */
async function analyzeImpl(
  directory: string,
  startDate?: Date,
  endDate?: Date,
): Promise<AuditStatistics> {
  const entries = await readAllEntries(directory, startDate, endDate);

  if (entries.length === 0) {
    return {
      totalEvents: 0,
      eventsByType: {},
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    };
  }

  // Count events by type
  const eventsByType: Record<string, number> = {};
  for (const entry of entries) {
    eventsByType[entry.type] = (eventsByType[entry.type] || 0) + 1;
  }

  // Calculate time range
  const timestamps = entries.map(e => e.timestamp).sort();
  const timeRange = {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };

  // Calculate provider statistics if available
  const providerStats = calculateProviderStats(entries);

  return {
    totalEvents: entries.length,
    eventsByType,
    timeRange,
    providerStats,
  };
}

/**
 * Implementation of getRecentEvents
 */
async function getRecentEventsImpl(
  directory: string,
  limit: number,
): Promise<readonly AuditLogEntry[]> {
  const entries = await readAllEntries(directory);
  
  // Sort by timestamp descending and take the limit
  return entries
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Read all log entries from directory
 */
async function readAllEntries(
  directory: string,
  startDate?: Date,
  endDate?: Date,
): Promise<AuditLogEntry[]> {
  const entries: AuditLogEntry[] = [];

  try {
    const files = await readdir(directory);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort();

    for (const file of jsonlFiles) {
      // Filter by date if specified
      if (startDate || endDate) {
        const dateStr = file.replace('.jsonl', '');
        const fileDate = new Date(dateStr);
        
        if (startDate && fileDate < startDate) continue;
        if (endDate && fileDate > endDate) continue;
      }

      const filePath = path.join(directory, file);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;
          entries.push(entry);
        } catch {
          // Skip invalid lines
        }
      }
    }
  } catch {
    // Return empty array if directory doesn't exist
  }

  return entries;
}

/**
 * Calculate provider statistics from entries
 */
function calculateProviderStats(entries: AuditLogEntry[]): AuditStatistics['providerStats'] {
  const providerEntries = entries.filter(e => 
    e.type.startsWith('provider_') && e.payload.provider
  );

  if (providerEntries.length === 0) {
    return undefined;
  }

  const requestsByProvider: Record<string, number> = {};
  let totalRequests = 0;
  let successCount = 0;
  let totalDuration = 0;
  let durationCount = 0;

  for (const entry of providerEntries) {
    const provider = entry.payload.provider as string;
    
    if (entry.type === 'provider_request') {
      totalRequests++;
      requestsByProvider[provider] = (requestsByProvider[provider] || 0) + 1;
    } else if (entry.type === 'provider_response_success') {
      successCount++;
      
      if (typeof entry.payload.durationMs === 'number') {
        totalDuration += entry.payload.durationMs;
        durationCount++;
      }
    }
  }

  return {
    totalRequests,
    successRate: totalRequests > 0 ? successCount / totalRequests : 0,
    averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    requestsByProvider,
  };
}
