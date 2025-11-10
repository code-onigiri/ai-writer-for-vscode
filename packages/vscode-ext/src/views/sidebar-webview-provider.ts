import * as vscode from 'vscode';

export type TabType = 'overview' | 'outline' | 'draft' | 'template' | 'persona' | 'settings';

export interface TabMessage {
  command: string;
  tab?: TabType;
  data?: unknown;
}

export interface OutlineItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface DraftItem {
  id: string;
  title: string;
  content: string;
  fileStructure?: FileNode[];
  updatedAt: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  points: { id: string; title: string; instructions: string }[];
}

export interface PersonaItem {
  id: string;
  name: string;
  tone?: string;
  audience?: string;
  parameters: Record<string, string>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface PromptConfig {
  id: string;
  name: string;
  content: string;
}

export interface TaskOverview {
  currentTask?: string;
  status: 'idle' | 'generating' | 'critiquing' | 'reflecting' | 'questioning';
  progress: number;
  streamingContent?: string;
}

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-writer.sidebarView';
  private view?: vscode.WebviewView;
  private currentTab: TabType = 'overview';
  
  // Data stores
  private outlines: OutlineItem[] = [];
  private drafts: DraftItem[] = [];
  private templates: TemplateItem[] = [];
  private personas: PersonaItem[] = [];
  private providers: ProviderConfig[] = [];
  private prompts: PromptConfig[] = [];
  private taskOverview: TaskOverview = { status: 'idle', progress: 0 };

  constructor(
    private readonly extensionUri: vscode.Uri,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: TabMessage) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: TabMessage): Promise<void> {
    switch (message.command) {
      case 'switchTab':
        if (message.tab) {
          this.currentTab = message.tab;
          this.updateView();
        }
        break;

      case 'loadOutlines':
        await this.loadOutlines();
        break;

      case 'selectOutline':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.selectOutline(message.data.id as string);
        }
        break;

      case 'addOutline':
        await this.addOutline();
        break;

      case 'editOutline':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.editOutline(message.data as OutlineItem);
        }
        break;

      case 'deleteOutline':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.deleteOutline(message.data.id as string);
        }
        break;

      case 'loadDrafts':
        await this.loadDrafts();
        break;

      case 'selectDraft':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.selectDraft(message.data.id as string);
        }
        break;

      case 'loadTemplates':
        await this.loadTemplates();
        break;

      case 'selectTemplate':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.selectTemplate(message.data.id as string);
        }
        break;

      case 'addTemplate':
        await this.addTemplate();
        break;

      case 'editTemplate':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.editTemplate(message.data as TemplateItem);
        }
        break;

      case 'deleteTemplate':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.deleteTemplate(message.data.id as string);
        }
        break;

      case 'loadPersonas':
        await this.loadPersonas();
        break;

      case 'selectPersona':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.selectPersona(message.data.id as string);
        }
        break;

      case 'addPersona':
        await this.addPersona();
        break;

      case 'editPersona':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.editPersona(message.data as PersonaItem);
        }
        break;

      case 'deletePersona':
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          await this.deletePersona(message.data.id as string);
        }
        break;

      case 'saveSettings':
        if (message.data && typeof message.data === 'object') {
          await this.saveSettings(message.data as { providers?: ProviderConfig[]; prompts?: PromptConfig[] });
        }
        break;
    }
  }

  // Public methods for updating data
  public updateTaskOverview(overview: TaskOverview): void {
    this.taskOverview = overview;
    if (this.view && this.currentTab === 'overview') {
      this.view.webview.postMessage({
        type: 'updateTaskOverview',
        data: overview,
      });
    }
  }

  public updateOutlines(outlines: OutlineItem[]): void {
    this.outlines = outlines;
    if (this.view && this.currentTab === 'outline') {
      this.view.webview.postMessage({
        type: 'updateOutlines',
        data: outlines,
      });
    }
  }

  public updateDrafts(drafts: DraftItem[]): void {
    this.drafts = drafts;
    if (this.view && this.currentTab === 'draft') {
      this.view.webview.postMessage({
        type: 'updateDrafts',
        data: drafts,
      });
    }
  }

  public updateTemplates(templates: TemplateItem[]): void {
    this.templates = templates;
    if (this.view && this.currentTab === 'template') {
      this.view.webview.postMessage({
        type: 'updateTemplates',
        data: templates,
      });
    }
  }

  public updatePersonas(personas: PersonaItem[]): void {
    this.personas = personas;
    if (this.view && this.currentTab === 'persona') {
      this.view.webview.postMessage({
        type: 'updatePersonas',
        data: personas,
      });
    }
  }

  private updateView(): void {
    if (!this.view) {
      return;
    }

    // Send current tab data
    switch (this.currentTab) {
      case 'overview':
        this.view.webview.postMessage({
          type: 'updateTaskOverview',
          data: this.taskOverview,
        });
        break;
      case 'outline':
        this.view.webview.postMessage({
          type: 'updateOutlines',
          data: this.outlines,
        });
        break;
      case 'draft':
        this.view.webview.postMessage({
          type: 'updateDrafts',
          data: this.drafts,
        });
        break;
      case 'template':
        this.view.webview.postMessage({
          type: 'updateTemplates',
          data: this.templates,
        });
        break;
      case 'persona':
        this.view.webview.postMessage({
          type: 'updatePersonas',
          data: this.personas,
        });
        break;
      case 'settings':
        this.view.webview.postMessage({
          type: 'updateSettings',
          data: { providers: this.providers, prompts: this.prompts },
        });
        break;
    }
  }

  // Placeholder methods - to be implemented with actual business logic
  private async loadOutlines(): Promise<void> {
    // TODO: Load from storage
    this.updateOutlines(this.outlines);
  }

  private async selectOutline(id: string): Promise<void> {
    const outline = this.outlines.find(o => o.id === id);
    if (outline && this.view) {
      this.view.webview.postMessage({
        type: 'selectedOutline',
        data: outline,
      });
    }
  }

  private async addOutline(): Promise<void> {
    await vscode.commands.executeCommand('ai-writer.startOutline');
  }

  private async editOutline(outline: OutlineItem): Promise<void> {
    // TODO: Implement edit logic
    void vscode.window.showInformationMessage(`Editing outline: ${outline.title}`);
  }

  private async deleteOutline(id: string): Promise<void> {
    this.outlines = this.outlines.filter(o => o.id !== id);
    this.updateOutlines(this.outlines);
    void vscode.window.showInformationMessage('Outline deleted');
  }

  private async loadDrafts(): Promise<void> {
    // TODO: Load from storage
    this.updateDrafts(this.drafts);
  }

  private async selectDraft(id: string): Promise<void> {
    const draft = this.drafts.find(d => d.id === id);
    if (draft && this.view) {
      this.view.webview.postMessage({
        type: 'selectedDraft',
        data: draft,
      });
    }
  }

  private async loadTemplates(): Promise<void> {
    // TODO: Load from registry
    this.updateTemplates(this.templates);
  }

  private async selectTemplate(id: string): Promise<void> {
    const template = this.templates.find(t => t.id === id);
    if (template && this.view) {
      this.view.webview.postMessage({
        type: 'selectedTemplate',
        data: template,
      });
    }
  }

  private async addTemplate(): Promise<void> {
    await vscode.commands.executeCommand('ai-writer.createTemplate');
  }

  private async editTemplate(template: TemplateItem): Promise<void> {
    // TODO: Implement edit logic
    void vscode.window.showInformationMessage(`Editing template: ${template.name}`);
  }

  private async deleteTemplate(id: string): Promise<void> {
    this.templates = this.templates.filter(t => t.id !== id);
    this.updateTemplates(this.templates);
    void vscode.window.showInformationMessage('Template deleted');
  }

  private async loadPersonas(): Promise<void> {
    // TODO: Load from manager
    this.updatePersonas(this.personas);
  }

  private async selectPersona(id: string): Promise<void> {
    const persona = this.personas.find(p => p.id === id);
    if (persona && this.view) {
      this.view.webview.postMessage({
        type: 'selectedPersona',
        data: persona,
      });
    }
  }

  private async addPersona(): Promise<void> {
    await vscode.commands.executeCommand('ai-writer.createPersona');
  }

  private async editPersona(persona: PersonaItem): Promise<void> {
    // TODO: Implement edit logic
    void vscode.window.showInformationMessage(`Editing persona: ${persona.name}`);
  }

  private async deletePersona(id: string): Promise<void> {
    this.personas = this.personas.filter(p => p.id !== id);
    this.updatePersonas(this.personas);
    void vscode.window.showInformationMessage('Persona deleted');
  }

  private async saveSettings(data: { providers?: ProviderConfig[]; prompts?: PromptConfig[] }): Promise<void> {
    if (data.providers) {
      this.providers = data.providers;
      void vscode.window.showInformationMessage('Provider settings saved');
    }
    if (data.prompts) {
      this.prompts = data.prompts;
      void vscode.window.showInformationMessage('Prompt settings saved');
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>AI Writer</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <div class="tabs">
      <button class="tab-button active" data-tab="overview">Overview</button>
      <button class="tab-button" data-tab="outline">Outline</button>
      <button class="tab-button" data-tab="draft">Draft</button>
      <button class="tab-button" data-tab="template">Template</button>
      <button class="tab-button" data-tab="persona">Persona</button>
      <button class="tab-button" data-tab="settings">Settings</button>
    </div>

    <div class="tab-content">
      <div id="overview-tab" class="tab-pane active">
        <div class="task-header">
          <h2>現在のタスク</h2>
          <div id="current-task" class="current-task">待機中...</div>
        </div>
        <div class="progress-section">
          <div class="progress-bar">
            <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
          </div>
          <div id="status-text" class="status-text">待機中</div>
        </div>
        <div class="stream-section">
          <h3>AI Activity Stream</h3>
          <div id="stream-content" class="stream-content"></div>
        </div>
      </div>

      <div id="outline-tab" class="tab-pane">
        <div class="list-header">
          <h2>Outline</h2>
          <button id="add-outline-btn" class="add-btn">+ 新規追加</button>
        </div>
        <div id="outline-list" class="item-list"></div>
        <div id="outline-detail" class="item-detail"></div>
      </div>

      <div id="draft-tab" class="tab-pane">
        <div class="list-header">
          <h2>Draft</h2>
          <select id="draft-selector" class="draft-selector">
            <option value="">ドラフトを選択...</option>
          </select>
        </div>
        <div id="draft-detail" class="draft-detail"></div>
      </div>

      <div id="template-tab" class="tab-pane">
        <div class="list-header">
          <h2>Template</h2>
          <button id="add-template-btn" class="add-btn">+ 新規追加</button>
        </div>
        <div id="template-list" class="item-list"></div>
        <div id="template-detail" class="item-detail"></div>
      </div>

      <div id="persona-tab" class="tab-pane">
        <div class="list-header">
          <h2>Persona</h2>
          <button id="add-persona-btn" class="add-btn">+ 新規追加</button>
        </div>
        <div id="persona-list" class="item-list"></div>
        <div id="persona-detail" class="item-detail"></div>
      </div>

      <div id="settings-tab" class="tab-pane">
        <h2>Settings</h2>
        <div class="settings-section">
          <h3>AI Providers</h3>
          <div id="providers-list" class="settings-list"></div>
        </div>
        <div class="settings-section">
          <h3>Prompts</h3>
          <div id="prompts-list" class="settings-list"></div>
        </div>
        <button id="save-settings-btn" class="save-btn">保存</button>
      </div>
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
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background-color: var(--vscode-sideBar-background);
        padding: 0;
      }

      .container {
        height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .tabs {
        display: flex;
        border-bottom: 1px solid var(--vscode-panel-border);
        background-color: var(--vscode-sideBarSectionHeader-background);
        overflow-x: auto;
        flex-shrink: 0;
      }

      .tab-button {
        padding: 8px 12px;
        background: none;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .tab-button:hover {
        opacity: 1;
        background-color: var(--vscode-list-hoverBackground);
      }

      .tab-button.active {
        opacity: 1;
        border-bottom: 2px solid var(--vscode-focusBorder);
      }

      .tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }

      .tab-pane {
        display: none;
      }

      .tab-pane.active {
        display: block;
      }

      h2 {
        font-size: 16px;
        margin-bottom: 12px;
      }

      h3 {
        font-size: 14px;
        margin: 12px 0 8px;
      }

      .task-header {
        margin-bottom: 16px;
      }

      .current-task {
        padding: 12px;
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        margin-top: 8px;
      }

      .progress-section {
        margin-bottom: 16px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background-color: var(--vscode-progressBar-background);
        transition: width 0.3s ease;
      }

      .status-text {
        font-size: 12px;
        opacity: 0.8;
      }

      .stream-section {
        margin-top: 16px;
      }

      .stream-content {
        padding: 12px;
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        max-height: 300px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 11px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .add-btn {
        padding: 6px 12px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .add-btn:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .item-list {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        margin-bottom: 12px;
        max-height: 200px;
        overflow-y: auto;
      }

      .item-list-item {
        padding: 10px;
        border-bottom: 1px solid var(--vscode-panel-border);
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .item-list-item:last-child {
        border-bottom: none;
      }

      .item-list-item:hover {
        background-color: var(--vscode-list-hoverBackground);
      }

      .item-list-item.selected {
        background-color: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }

      .item-detail {
        padding: 12px;
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        min-height: 200px;
      }

      .item-detail h3 {
        margin-top: 0;
      }

      .item-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }

      .edit-btn, .delete-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .edit-btn {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .edit-btn:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .delete-btn {
        background-color: var(--vscode-inputValidation-errorBackground);
        color: var(--vscode-inputValidation-errorForeground);
      }

      .delete-btn:hover {
        opacity: 0.8;
      }

      .draft-selector {
        padding: 6px 12px;
        background-color: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        cursor: pointer;
      }

      .draft-detail {
        padding: 12px;
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        margin-top: 12px;
      }

      .file-structure {
        margin-top: 12px;
        padding: 12px;
        background-color: var(--vscode-sideBar-background);
        border-radius: 4px;
      }

      .file-node {
        padding: 4px 0;
        padding-left: 16px;
      }

      .file-node.directory {
        font-weight: bold;
      }

      .settings-section {
        margin-bottom: 24px;
      }

      .settings-list {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        padding: 12px;
      }

      .settings-item {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .settings-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }

      .save-btn {
        padding: 8px 16px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .save-btn:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .empty-state {
        padding: 32px;
        text-align: center;
        opacity: 0.6;
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();
      let currentTab = 'overview';
      let selectedOutlineId = null;
      let selectedTemplateId = null;
      let selectedPersonaId = null;

      // Tab switching
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
          const tab = button.dataset.tab;
          switchTab(tab);
        });
      });

      function switchTab(tab) {
        currentTab = tab;
        
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
          if (btn.dataset.tab === tab) {
            btn.classList.add('active');
          }
        });

        // Update pane visibility
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(tab + '-tab').classList.add('active');

        // Load data for the tab
        vscode.postMessage({ command: 'switchTab', tab });
        loadTabData(tab);
      }

      function loadTabData(tab) {
        switch (tab) {
          case 'outline':
            vscode.postMessage({ command: 'loadOutlines' });
            break;
          case 'draft':
            vscode.postMessage({ command: 'loadDrafts' });
            break;
          case 'template':
            vscode.postMessage({ command: 'loadTemplates' });
            break;
          case 'persona':
            vscode.postMessage({ command: 'loadPersonas' });
            break;
        }
      }

      // Overview tab handlers
      function updateTaskOverview(data) {
        const taskEl = document.getElementById('current-task');
        const progressFill = document.getElementById('progress-fill');
        const statusText = document.getElementById('status-text');
        const streamContent = document.getElementById('stream-content');

        taskEl.textContent = data.currentTask || '待機中...';
        progressFill.style.width = data.progress + '%';
        
        const statusMap = {
          idle: '待機中',
          generating: '生成中',
          critiquing: '批判中',
          reflecting: '考察中',
          questioning: '質問中'
        };
        statusText.textContent = statusMap[data.status] || data.status;

        if (data.streamingContent) {
          streamContent.textContent = data.streamingContent;
          streamContent.scrollTop = streamContent.scrollHeight;
        }
      }

      // Outline tab handlers
      document.getElementById('add-outline-btn')?.addEventListener('click', () => {
        vscode.postMessage({ command: 'addOutline' });
      });

      function updateOutlines(outlines) {
        const listEl = document.getElementById('outline-list');
        if (outlines.length === 0) {
          listEl.innerHTML = '<div class="empty-state">アウトラインがありません</div>';
          return;
        }

        listEl.innerHTML = outlines.map(outline => 
          \`<div class="item-list-item \${selectedOutlineId === outline.id ? 'selected' : ''}" 
               data-id="\${outline.id}">
            <div>\${outline.title}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
              \${new Date(outline.updatedAt).toLocaleString('ja-JP')}
            </div>
          </div>\`
        ).join('');

        listEl.querySelectorAll('.item-list-item').forEach(item => {
          item.addEventListener('click', () => {
            selectedOutlineId = item.dataset.id;
            vscode.postMessage({ command: 'selectOutline', data: { id: selectedOutlineId } });
            updateOutlines(outlines);
          });
        });
      }

      function showSelectedOutline(outline) {
        const detailEl = document.getElementById('outline-detail');
        detailEl.innerHTML = \`
          <h3>\${outline.title}</h3>
          <div style="margin-top: 12px; white-space: pre-wrap;">\${outline.content}</div>
          <div class="item-actions">
            <button class="edit-btn" onclick="editOutline('\${outline.id}')">編集</button>
            <button class="delete-btn" onclick="deleteOutline('\${outline.id}')">削除</button>
          </div>
        \`;
      }

      function editOutline(id) {
        vscode.postMessage({ command: 'editOutline', data: { id } });
      }

      function deleteOutline(id) {
        if (confirm('このアウトラインを削除しますか？')) {
          vscode.postMessage({ command: 'deleteOutline', data: { id } });
        }
      }

      // Draft tab handlers
      document.getElementById('draft-selector')?.addEventListener('change', (e) => {
        const draftId = e.target.value;
        if (draftId) {
          vscode.postMessage({ command: 'selectDraft', data: { id: draftId } });
        }
      });

      function updateDrafts(drafts) {
        const selectorEl = document.getElementById('draft-selector');
        selectorEl.innerHTML = '<option value="">ドラフトを選択...</option>' +
          drafts.map(draft => 
            \`<option value="\${draft.id}">\${draft.title}</option>\`
          ).join('');
      }

      function showSelectedDraft(draft) {
        const detailEl = document.getElementById('draft-detail');
        let html = \`<h3>\${draft.title}</h3>\`;
        
        if (draft.fileStructure && draft.fileStructure.length > 0) {
          html += '<div class="file-structure"><h4>ファイル構造:</h4>';
          html += renderFileStructure(draft.fileStructure);
          html += '</div>';
        }

        html += \`<div style="margin-top: 12px; white-space: pre-wrap;">\${draft.content}</div>\`;
        detailEl.innerHTML = html;
      }

      function renderFileStructure(nodes, level = 0) {
        return nodes.map(node => {
          const indent = 'padding-left: ' + (level * 16) + 'px';
          let html = \`<div class="file-node \${node.type}" style="\${indent}">\${node.name}</div>\`;
          if (node.children && node.children.length > 0) {
            html += renderFileStructure(node.children, level + 1);
          }
          return html;
        }).join('');
      }

      // Template tab handlers
      document.getElementById('add-template-btn')?.addEventListener('click', () => {
        vscode.postMessage({ command: 'addTemplate' });
      });

      function updateTemplates(templates) {
        const listEl = document.getElementById('template-list');
        if (templates.length === 0) {
          listEl.innerHTML = '<div class="empty-state">テンプレートがありません</div>';
          return;
        }

        listEl.innerHTML = templates.map(template => 
          \`<div class="item-list-item \${selectedTemplateId === template.id ? 'selected' : ''}" 
               data-id="\${template.id}">
            <div>\${template.name}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
              \${template.points.length} points
            </div>
          </div>\`
        ).join('');

        listEl.querySelectorAll('.item-list-item').forEach(item => {
          item.addEventListener('click', () => {
            selectedTemplateId = item.dataset.id;
            vscode.postMessage({ command: 'selectTemplate', data: { id: selectedTemplateId } });
            updateTemplates(templates);
          });
        });
      }

      function showSelectedTemplate(template) {
        const detailEl = document.getElementById('template-detail');
        let pointsHtml = template.points.map(point => 
          \`<div style="margin-bottom: 8px; padding: 8px; background-color: var(--vscode-sideBar-background); border-radius: 4px;">
            <strong>\${point.title}</strong>
            <div style="font-size: 11px; margin-top: 4px;">\${point.instructions}</div>
          </div>\`
        ).join('');

        detailEl.innerHTML = \`
          <h3>\${template.name}</h3>
          \${template.description ? '<p>' + template.description + '</p>' : ''}
          <div style="margin-top: 12px;">
            <h4>Points:</h4>
            \${pointsHtml}
          </div>
          <div class="item-actions">
            <button class="edit-btn" onclick="editTemplate('\${template.id}')">編集</button>
            <button class="delete-btn" onclick="deleteTemplate('\${template.id}')">削除</button>
          </div>
        \`;
      }

      function editTemplate(id) {
        vscode.postMessage({ command: 'editTemplate', data: { id } });
      }

      function deleteTemplate(id) {
        if (confirm('このテンプレートを削除しますか？')) {
          vscode.postMessage({ command: 'deleteTemplate', data: { id } });
        }
      }

      // Persona tab handlers
      document.getElementById('add-persona-btn')?.addEventListener('click', () => {
        vscode.postMessage({ command: 'addPersona' });
      });

      function updatePersonas(personas) {
        const listEl = document.getElementById('persona-list');
        if (personas.length === 0) {
          listEl.innerHTML = '<div class="empty-state">ペルソナがありません</div>';
          return;
        }

        listEl.innerHTML = personas.map(persona => 
          \`<div class="item-list-item \${selectedPersonaId === persona.id ? 'selected' : ''}" 
               data-id="\${persona.id}">
            <div>\${persona.name}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
              \${persona.tone || 'N/A'} | \${persona.audience || 'N/A'}
            </div>
          </div>\`
        ).join('');

        listEl.querySelectorAll('.item-list-item').forEach(item => {
          item.addEventListener('click', () => {
            selectedPersonaId = item.dataset.id;
            vscode.postMessage({ command: 'selectPersona', data: { id: selectedPersonaId } });
            updatePersonas(personas);
          });
        });
      }

      function showSelectedPersona(persona) {
        const detailEl = document.getElementById('persona-detail');
        let paramsHtml = Object.entries(persona.parameters || {}).map(([key, value]) => 
          \`<div>\${key}: \${value}</div>\`
        ).join('');

        detailEl.innerHTML = \`
          <h3>\${persona.name}</h3>
          <div style="margin-top: 12px;">
            <div><strong>Tone:</strong> \${persona.tone || 'N/A'}</div>
            <div><strong>Audience:</strong> \${persona.audience || 'N/A'}</div>
            \${paramsHtml ? '<div style="margin-top: 12px;"><strong>Parameters:</strong><br>' + paramsHtml + '</div>' : ''}
          </div>
          <div class="item-actions">
            <button class="edit-btn" onclick="editPersona('\${persona.id}')">編集</button>
            <button class="delete-btn" onclick="deletePersona('\${persona.id}')">削除</button>
          </div>
        \`;
      }

      function editPersona(id) {
        vscode.postMessage({ command: 'editPersona', data: { id } });
      }

      function deletePersona(id) {
        if (confirm('このペルソナを削除しますか？')) {
          vscode.postMessage({ command: 'deletePersona', data: { id } });
        }
      }

      // Settings tab handlers
      document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        // Collect settings data
        const settings = {
          providers: [], // TODO: collect from form
          prompts: [] // TODO: collect from form
        };
        vscode.postMessage({ command: 'saveSettings', data: settings });
      });

      function updateSettings(data) {
        const providersEl = document.getElementById('providers-list');
        const promptsEl = document.getElementById('prompts-list');

        if (data.providers) {
          providersEl.innerHTML = data.providers.map(p => 
            \`<div class="settings-item">
              <strong>\${p.name}</strong>
              <div style="font-size: 11px; margin-top: 4px;">
                Model: \${p.model || 'N/A'} | Enabled: \${p.enabled ? 'Yes' : 'No'}
              </div>
            </div>\`
          ).join('') || '<div class="empty-state">プロバイダーがありません</div>';
        }

        if (data.prompts) {
          promptsEl.innerHTML = data.prompts.map(p => 
            \`<div class="settings-item">
              <strong>\${p.name}</strong>
              <div style="font-size: 11px; margin-top: 4px; white-space: pre-wrap;">
                \${p.content.substring(0, 100)}...
              </div>
            </div>\`
          ).join('') || '<div class="empty-state">プロンプトがありません</div>';
        }
      }

      // Message handler
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
          case 'updateTaskOverview':
            updateTaskOverview(message.data);
            break;
          case 'updateOutlines':
            updateOutlines(message.data);
            break;
          case 'selectedOutline':
            showSelectedOutline(message.data);
            break;
          case 'updateDrafts':
            updateDrafts(message.data);
            break;
          case 'selectedDraft':
            showSelectedDraft(message.data);
            break;
          case 'updateTemplates':
            updateTemplates(message.data);
            break;
          case 'selectedTemplate':
            showSelectedTemplate(message.data);
            break;
          case 'updatePersonas':
            updatePersonas(message.data);
            break;
          case 'selectedPersona':
            showSelectedPersona(message.data);
            break;
          case 'updateSettings':
            updateSettings(message.data);
            break;
        }
      });
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
