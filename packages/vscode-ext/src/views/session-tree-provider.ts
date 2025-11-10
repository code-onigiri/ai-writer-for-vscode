import * as vscode from 'vscode';

import { SessionManager, type SessionRecord } from '../services/session-manager.js';

export class SessionTreeDataProvider implements vscode.TreeDataProvider<SessionTreeItem> {
  private readonly changeEmitter = new vscode.EventEmitter<SessionTreeItem | undefined>();

  constructor(private readonly sessionManager: SessionManager) {
    this.sessionManager.onDidChangeSessions(() => {
      this.refresh();
    });
  }

  get onDidChangeTreeData(): vscode.Event<SessionTreeItem | undefined> {
    return this.changeEmitter.event;
  }

  getTreeItem(element: SessionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SessionTreeItem): vscode.ProviderResult<SessionTreeItem[]> {
    if (element) {
      return [];
    }

    const sessions = this.sessionManager.getSessions();
    if (sessions.length === 0) {
      return [new EmptySessionsItem()];
    }

    return sessions.map((session) => new SessionTreeItem(session));
  }

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }
}

class SessionTreeItem extends vscode.TreeItem {
  constructor(readonly record: SessionRecord) {
    super(SessionTreeItem.buildLabel(record), vscode.TreeItemCollapsibleState.None);

    this.tooltip = SessionTreeItem.buildTooltip(record);
    this.description = new Date(record.updatedAt).toLocaleString();
    this.iconPath = new vscode.ThemeIcon(record.mode === 'outline' ? 'symbol-structure' : 'book');
    this.contextValue = 'aiWriterSession';
    this.command = {
      command: 'ai-writer.openSession',
      title: 'Open Session',
      arguments: [record.id],
    };
  }

  private static buildLabel(record: SessionRecord): string {
    const prefix = record.mode === 'outline' ? 'Outline' : 'Draft';
    const idea = record.idea ?? record.outlineId ?? record.id;
    return `[${prefix}] ${idea}`;
  }

  private static buildTooltip(record: SessionRecord): string {
    const lines = [
      `Session: ${record.id}`,
      `Status: ${record.status}`,
      `Updated: ${new Date(record.updatedAt).toLocaleString()}`,
    ];

    if (record.idea) {
      lines.push(`Idea: ${record.idea}`);
    }

    if (record.templateId) {
      lines.push(`Template: ${record.templateId}`);
    }

    if (record.personaId) {
      lines.push(`Persona: ${record.personaId}`);
    }

    return lines.join('\n');
  }
}

class EmptySessionsItem extends vscode.TreeItem {
  constructor() {
    super('No sessions yet. Run AI Writer commands to create one.', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('circle-outline');
    this.contextValue = 'aiWriterEmptySession';
  }
}
