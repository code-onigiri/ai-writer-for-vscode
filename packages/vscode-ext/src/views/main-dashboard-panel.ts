import * as vscode from 'vscode';

export interface DashboardAction {
  type: 'startOutline' | 'startDraft' | 'openSettings' | 'openSession' | 'openTemplate';
  payload?: unknown;
}

export class MainDashboardPanel {
  public static readonly viewType = 'ai-writer.mainDashboard';
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onAction: (action: DashboardAction) => void,
  ) {}

  public show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      MainDashboardPanel.viewType,
      'AI Writer Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    this.panel.webview.onDidReceiveMessage(
      (message: DashboardAction) => {
        this.onAction(message);
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
      },
      undefined,
      this.disposables
    );
  }

  public updateSessions(sessions: SessionItem[]): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'updateSessions',
      sessions,
    });
  }

  public updateTemplates(templates: TemplateItem[]): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'updateTemplates',
      templates,
    });
  }

  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
    }
    this.disposables.forEach(d => d.dispose());
  }

  private getHtmlContent(): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>AI Writer Dashboard</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🤖 AI Writer Dashboard</h1>
      <p class="subtitle">自律型文章生成スイート</p>
    </header>

    <div class="actions-grid">
      <div class="action-card" id="outline-card">
        <div class="card-icon">📝</div>
        <h2>アウトライン生成</h2>
        <p>アイデアから構造化されたアウトラインを生成</p>
        <button class="btn btn-primary" onclick="startOutline()">開始</button>
      </div>

      <div class="action-card" id="draft-card">
        <div class="card-icon">✍️</div>
        <h2>ドラフト生成</h2>
        <p>アウトラインから完全な文章を生成</p>
        <button class="btn btn-primary" onclick="startDraft()">開始</button>
      </div>

      <div class="action-card" id="settings-card">
        <div class="card-icon">⚙️</div>
        <h2>設定</h2>
        <p>AI Provider、テンプレート、ペルソナの管理</p>
        <button class="btn btn-secondary" onclick="openSettings()">設定を開く</button>
      </div>
    </div>

    <div class="content-sections">
      <section class="content-section">
        <div class="section-header">
          <h2>📂 最近のセッション</h2>
          <button class="btn-icon" onclick="refreshSessions()" title="更新">
            <span>🔄</span>
          </button>
        </div>
        <div id="sessions-list" class="items-list">
          <div class="loading">読み込み中...</div>
        </div>
      </section>

      <section class="content-section">
        <div class="section-header">
          <h2>📋 テンプレート</h2>
          <button class="btn-icon" onclick="refreshTemplates()" title="更新">
            <span>🔄</span>
          </button>
        </div>
        <div id="templates-list" class="items-list">
          <div class="loading">読み込み中...</div>
        </div>
      </section>
    </div>
  </div>

  <script nonce="${nonce}">
    ${this.getScript()}
  </script>
</body>
</html>`;
  }

  private getStyles(): string {
    return `
      :root {
        --spacing-xs: 0.25rem;
        --spacing-sm: 0.5rem;
        --spacing-md: 1rem;
        --spacing-lg: 1.5rem;
        --spacing-xl: 2rem;
        --radius-sm: 4px;
        --radius-md: 8px;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        padding: var(--spacing-lg);
        line-height: 1.6;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        text-align: center;
        margin-bottom: var(--spacing-xl);
        padding-bottom: var(--spacing-lg);
        border-bottom: 2px solid var(--vscode-panel-border);
      }

      .header h1 {
        font-size: 2rem;
        margin-bottom: var(--spacing-sm);
        color: var(--vscode-textLink-foreground);
      }

      .subtitle {
        font-size: 1rem;
        color: var(--vscode-descriptionForeground);
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-xl);
      }

      .action-card {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        text-align: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .action-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .card-icon {
        font-size: 3rem;
        margin-bottom: var(--spacing-md);
      }

      .action-card h2 {
        font-size: 1.2rem;
        margin-bottom: var(--spacing-sm);
      }

      .action-card p {
        font-size: 0.9rem;
        color: var(--vscode-descriptionForeground);
        margin-bottom: var(--spacing-lg);
      }

      .btn {
        padding: var(--spacing-sm) var(--spacing-lg);
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.2s;
      }

      .btn-primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-primary:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .btn-secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-secondary:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        padding: var(--spacing-xs);
        color: var(--vscode-foreground);
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .btn-icon:hover {
        opacity: 1;
      }

      .content-sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: var(--spacing-lg);
      }

      .content-section {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .section-header h2 {
        font-size: 1.1rem;
      }

      .items-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        max-height: 400px;
        overflow-y: auto;
      }

      .item {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: var(--radius-sm);
        padding: var(--spacing-md);
        cursor: pointer;
        transition: background 0.2s;
      }

      .item:hover {
        background: var(--vscode-list-hoverBackground);
      }

      .item-title {
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
      }

      .item-meta {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
        display: flex;
        gap: var(--spacing-md);
      }

      .loading {
        text-align: center;
        padding: var(--spacing-lg);
        color: var(--vscode-descriptionForeground);
      }

      .empty {
        text-align: center;
        padding: var(--spacing-lg);
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();

      function startOutline() {
        vscode.postMessage({
          type: 'startOutline'
        });
      }

      function startDraft() {
        vscode.postMessage({
          type: 'startDraft'
        });
      }

      function openSettings() {
        vscode.postMessage({
          type: 'openSettings'
        });
      }

      function refreshSessions() {
        vscode.postMessage({
          type: 'refreshSessions'
        });
      }

      function refreshTemplates() {
        vscode.postMessage({
          type: 'refreshTemplates'
        });
      }

      function openSession(sessionId) {
        vscode.postMessage({
          type: 'openSession',
          payload: { sessionId }
        });
      }

      function openTemplate(templateId) {
        vscode.postMessage({
          type: 'openTemplate',
          payload: { templateId }
        });
      }

      window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
          case 'updateSessions':
            updateSessionsList(message.sessions);
            break;
          case 'updateTemplates':
            updateTemplatesList(message.templates);
            break;
        }
      });

      function updateSessionsList(sessions) {
        const list = document.getElementById('sessions-list');
        if (!list) return;

        if (!sessions || sessions.length === 0) {
          list.innerHTML = '<div class="empty">セッションがありません</div>';
          return;
        }

        list.innerHTML = sessions.map(session => \`
          <div class="item" onclick="openSession('\${session.id}')">
            <div class="item-title">\${escapeHtml(session.idea || session.id)}</div>
            <div class="item-meta">
              <span>\${session.mode === 'outline' ? '📝 アウトライン' : '✍️ ドラフト'}</span>
              <span>\${new Date(session.updatedAt).toLocaleString('ja-JP')}</span>
            </div>
          </div>
        \`).join('');
      }

      function updateTemplatesList(templates) {
        const list = document.getElementById('templates-list');
        if (!list) return;

        if (!templates || templates.length === 0) {
          list.innerHTML = '<div class="empty">テンプレートがありません</div>';
          return;
        }

        list.innerHTML = templates.map(template => \`
          <div class="item" onclick="openTemplate('\${template.id}')">
            <div class="item-title">\${escapeHtml(template.name)}</div>
            <div class="item-meta">
              <span>📋 \${template.points?.length || 0} ポイント</span>
            </div>
          </div>
        \`).join('');
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // 初期表示時にデータを要求
      refreshSessions();
      refreshTemplates();
    `;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}

export interface SessionItem {
  id: string;
  mode: 'outline' | 'draft';
  idea?: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  points?: { id: string }[];
}
