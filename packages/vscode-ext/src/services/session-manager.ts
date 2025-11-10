import * as vscode from 'vscode';

const STORAGE_KEY = 'ai-writer.sessions';

export type SessionMode = 'outline' | 'draft';
export type SessionStatus = 'running' | 'completed' | 'failed';

export interface SessionRecord {
  readonly id: string;
  readonly mode: SessionMode;
  readonly idea?: string;
  readonly outlineId?: string;
  readonly personaId?: string;
  readonly templateId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: SessionStatus;
  readonly progressMessage?: string;
  readonly previewContent: string;
  readonly metadata?: Record<string, unknown>;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly didChangeEmitter = new vscode.EventEmitter<void>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly statusBar: vscode.StatusBarItem,
  ) {
    const stored = this.context.workspaceState.get<SessionRecord[]>(STORAGE_KEY, []);
    stored.forEach((session) => this.sessions.set(session.id, session));

    if (stored.length > 0) {
      this.updateStatusBar(stored[stored.length - 1]);
    } else {
      this.resetStatusBar();
    }
  }

  dispose(): void {
    this.didChangeEmitter.dispose();
  }

  get onDidChangeSessions(): vscode.Event<void> {
    return this.didChangeEmitter.event;
  }

  getSessions(): SessionRecord[] {
    return Array.from(this.sessions.values()).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  getSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  upsertSession(record: SessionRecord): SessionRecord {
    const merged = this.mergeSession(record);

    this.sessions.set(merged.id, merged);
    this.persist();
    this.didChangeEmitter.fire();
    this.updateStatusBar(merged);
    return merged;
  }

  updateSession(
    id: string,
    update: Partial<Omit<SessionRecord, 'id' | 'createdAt'>>,
  ): SessionRecord | undefined {
    const existing = this.sessions.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: SessionRecord = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(id, updated);
    this.persist();
    this.didChangeEmitter.fire();
    this.updateStatusBar(updated);
    return updated;
  }

  removeSession(id: string): void {
    if (!this.sessions.has(id)) {
      return;
    }

    this.sessions.delete(id);
    this.persist();
    this.didChangeEmitter.fire();

    if (this.sessions.size === 0) {
      this.resetStatusBar();
    } else {
      const mostRecent = this.getSessions()[0];
      this.updateStatusBar(mostRecent);
    }
  }

  async openSessionPreview(record: SessionRecord, preserveFocus = false): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content: record.previewContent,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(document, {
      preview: true,
      preserveFocus,
    });
  }

  private mergeSession(record: SessionRecord): SessionRecord {
    const existing = this.sessions.get(record.id);
    if (!existing) {
      return record;
    }

    return {
      ...existing,
      ...record,
      createdAt: existing.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private persist(): void {
    void this.context.workspaceState.update(STORAGE_KEY, this.getSessions());
  }

  private updateStatusBar(session: SessionRecord): void {
    const label = session.mode === 'outline' ? 'Outline' : 'Draft';

    if (session.status === 'running') {
      this.statusBar.text = `$(loading~spin) AI Writer: ${label}…`;
    } else if (session.status === 'failed') {
      this.statusBar.text = `$(error) AI Writer: ${label} failed`;
    } else {
      this.statusBar.text = `$(pencil) AI Writer: ${label} ready`;
    }

    const idea = session.idea ? ` • ${session.idea}` : '';
    this.statusBar.tooltip = `Session ${session.id}${idea}`;
    this.statusBar.command = 'ai-writer.openLatestSession';
    this.statusBar.show();
  }

  private resetStatusBar(): void {
    this.statusBar.text = 'AI Writer idle';
    this.statusBar.tooltip = 'No active AI Writer session';
    this.statusBar.command = undefined;
    this.statusBar.hide();
  }
}
