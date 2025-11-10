import * as vscode from 'vscode';

import type { CommandContext, CommandResult } from './types.js';

/**
 * Handler for viewing storage statistics
 */
export async function viewStorageStatsHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Mock statistics for demonstration
    const stats = {
      totalSessions: 15,
      totalTemplates: 5,
      totalPersonas: 3,
      storageSize: 1024 * 1024 * 2.5, // 2.5 MB
      lastUpdated: new Date().toISOString(),
    };

    const message = `Storage Statistics\n\n` +
      `Sessions: ${stats.totalSessions}\n` +
      `Templates: ${stats.totalTemplates}\n` +
      `Personas: ${stats.totalPersonas}\n` +
      `Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB\n` +
      `Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`;

    outputChannel.appendLine(message);
    vscode.window.showInformationMessage(
      `Storage: ${stats.totalSessions} sessions, ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
    );

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handler for viewing audit log statistics
 */
export async function viewAuditStatsHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    // Mock audit statistics for demonstration
    const auditStats = {
      totalEvents: 150,
      eventsByType: {
        'provider_request': 50,
        'provider_response_success': 45,
        'provider_response_error': 5,
      },
      providerStats: {
        totalRequests: 50,
        successRate: 0.9,
        averageDuration: 1250,
        requestsByProvider: {
          'openai': 30,
          'gemini-api': 20,
        },
      },
    };

    const message = `Audit Log Statistics\n\n` +
      `Total Events: ${auditStats.totalEvents}\n\n` +
      `Provider Statistics:\n` +
      `  Total Requests: ${auditStats.providerStats.totalRequests}\n` +
      `  Success Rate: ${(auditStats.providerStats.successRate * 100).toFixed(1)}%\n` +
      `  Average Duration: ${auditStats.providerStats.averageDuration.toFixed(0)}ms\n\n` +
      `Requests by Provider:\n` +
      Object.entries(auditStats.providerStats.requestsByProvider)
        .map(([provider, count]) => `  ${provider}: ${count}`)
        .join('\n');

    outputChannel.appendLine(message);
    vscode.window.showInformationMessage(
      `Success Rate: ${(auditStats.providerStats.successRate * 100).toFixed(1)}% | Avg: ${auditStats.providerStats.averageDuration}ms`,
    );

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handler for cleaning up old sessions
 */
export async function cleanupStorageHandler(
  context: CommandContext,
): Promise<CommandResult<void>> {
  const { outputChannel } = context;

  try {
    const days = await vscode.window.showInputBox({
      prompt: 'Delete sessions older than how many days?',
      placeHolder: '30',
      value: '30',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1) {
          return 'Please enter a valid positive number';
        }
        return undefined;
      },
    });

    if (!days) {
      return { kind: 'cancelled' };
    }

    const daysNum = parseInt(days, 10);

    // Confirm before cleanup
    const confirm = await vscode.window.showWarningMessage(
      `Delete sessions older than ${daysNum} days?`,
      { modal: true },
      'Yes',
      'No',
    );

    if (confirm !== 'Yes') {
      return { kind: 'cancelled' };
    }

    // Mock cleanup result
    const deletedCount = 8;

    outputChannel.appendLine(`Cleaned up ${deletedCount} old sessions`);
    vscode.window.showInformationMessage(`Deleted ${deletedCount} old sessions`);

    return { kind: 'ok', value: undefined };
  } catch (error) {
    return {
      kind: 'err',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
