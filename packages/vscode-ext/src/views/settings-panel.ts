import * as vscode from 'vscode';

export interface SettingsData {
  providers: ProviderConfig[];
  templates: TemplateConfig[];
  personas: PersonaConfig[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  points: Array<{ id: string; title: string; instructions: string }>;
}

export interface PersonaConfig {
  id: string;
  name: string;
  enabled: boolean;
  tone?: string;
  audience?: string;
  parameters: Record<string, string>;
}

export class SettingsPanel {
  public static readonly viewType = 'ai-writer.settings';
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onSave: (data: Partial<SettingsData>) => Promise<void>,
  ) {}

  public show(initialData: SettingsData): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      this.updateSettings(initialData);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      SettingsPanel.viewType,
      'AI Writer Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.webview.html = this.getHtmlContent(initialData);

    this.panel.webview.onDidReceiveMessage(
      async (message: { type: string; data?: unknown }) => {
        switch (message.type) {
          case 'saveProviders':
            await this.onSave({ providers: message.data as ProviderConfig[] });
            void vscode.window.showInformationMessage('Provider設定を保存しました');
            break;
          case 'saveTemplates':
            await this.onSave({ templates: message.data as TemplateConfig[] });
            void vscode.window.showInformationMessage('テンプレート設定を保存しました');
            break;
          case 'savePersonas':
            await this.onSave({ personas: message.data as PersonaConfig[] });
            void vscode.window.showInformationMessage('ペルソナ設定を保存しました');
            break;
        }
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

  public updateSettings(data: SettingsData): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'updateSettings',
      data,
    });
  }

  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
    }
    this.disposables.forEach(d => d.dispose());
  }

  private getHtmlContent(initialData: SettingsData): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>AI Writer Settings</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>⚙️ AI Writer Settings</h1>
    </header>

    <div class="tabs">
      <button class="tab-button active" data-tab="providers">AI Providers</button>
      <button class="tab-button" data-tab="templates">テンプレート</button>
      <button class="tab-button" data-tab="personas">ペルソナ</button>
    </div>

    <div class="tab-content active" id="providers-tab">
      <h2>AI Provider設定</h2>
      <div id="providers-list"></div>
      <button class="btn btn-secondary" onclick="addProvider()">+ Provider追加</button>
    </div>

    <div class="tab-content" id="templates-tab">
      <h2>テンプレート管理</h2>
      <div id="templates-list"></div>
      <button class="btn btn-secondary" onclick="addTemplate()">+ テンプレート追加</button>
    </div>

    <div class="tab-content" id="personas-tab">
      <h2>ペルソナ管理</h2>
      <div id="personas-list"></div>
      <button class="btn btn-secondary" onclick="addPersona()">+ ペルソナ追加</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const initialData = ${JSON.stringify(initialData)};
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
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
      }

      .header {
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 2px solid var(--vscode-panel-border);
      }

      .header h1 {
        font-size: 1.8rem;
      }

      .tabs {
        display: flex;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .tab-button {
        padding: var(--spacing-md) var(--spacing-lg);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 1rem;
        color: var(--vscode-foreground);
        transition: border-color 0.2s;
      }

      .tab-button:hover {
        border-bottom-color: var(--vscode-textLink-foreground);
      }

      .tab-button.active {
        border-bottom-color: var(--vscode-focusBorder);
        font-weight: 600;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .tab-content h2 {
        font-size: 1.3rem;
        margin-bottom: var(--spacing-lg);
      }

      .form-group {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-md);
      }

      .form-row {
        display: flex;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        align-items: center;
      }

      .form-field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
      }

      input[type="text"],
      input[type="number"],
      textarea,
      select {
        padding: var(--spacing-sm);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: var(--radius-sm);
        font-family: var(--vscode-font-family);
        font-size: 0.95rem;
      }

      input[type="text"]:focus,
      input[type="number"]:focus,
      textarea:focus,
      select:focus {
        outline: 1px solid var(--vscode-focusBorder);
      }

      textarea {
        min-height: 80px;
        resize: vertical;
      }

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }

      .checkbox-field {
        flex-direction: row;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .checkbox-field label {
        margin: 0;
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

      .btn-danger {
        background: var(--vscode-errorForeground);
        color: var(--vscode-editor-background);
      }

      .btn-danger:hover {
        opacity: 0.9;
      }

      .btn-group {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        margin-top: var(--spacing-md);
      }

      .form-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();
      let currentData = initialData;

      // タブ切り替え
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
          const tabName = button.dataset.tab;
          
          document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          button.classList.add('active');
          document.getElementById(tabName + '-tab').classList.add('active');
        });
      });

      // Providers
      function renderProviders() {
        const list = document.getElementById('providers-list');
        list.innerHTML = currentData.providers.map((provider, index) => \`
          <div class="form-group">
            <div class="form-row">
              <div class="form-field checkbox-field">
                <input type="checkbox" id="provider-enabled-\${index}" 
                  \${provider.enabled ? 'checked' : ''}
                  onchange="updateProviderEnabled(\${index}, this.checked)">
                <label for="provider-enabled-\${index}">有効</label>
              </div>
              <div class="form-field">
                <label>名前</label>
                <input type="text" value="\${escapeHtml(provider.name)}" 
                  onchange="updateProviderName(\${index}, this.value)">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>モデル</label>
                <input type="text" value="\${escapeHtml(provider.model || '')}" 
                  onchange="updateProviderModel(\${index}, this.value)">
              </div>
              <div class="form-field">
                <label>Temperature</label>
                <input type="number" step="0.1" min="0" max="2" 
                  value="\${provider.temperature || 0.7}" 
                  onchange="updateProviderTemperature(\${index}, parseFloat(this.value))">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-danger" onclick="deleteProvider(\${index})">削除</button>
              <button class="btn btn-primary" onclick="saveProviders()">保存</button>
            </div>
          </div>
        \`).join('');
      }

      function updateProviderEnabled(index, enabled) {
        currentData.providers[index].enabled = enabled;
      }

      function updateProviderName(index, name) {
        currentData.providers[index].name = name;
      }

      function updateProviderModel(index, model) {
        currentData.providers[index].model = model;
      }

      function updateProviderTemperature(index, temp) {
        currentData.providers[index].temperature = temp;
      }

      function addProvider() {
        currentData.providers.push({
          id: 'provider-' + Date.now(),
          name: 'New Provider',
          enabled: false,
          model: '',
          temperature: 0.7
        });
        renderProviders();
      }

      function deleteProvider(index) {
        currentData.providers.splice(index, 1);
        renderProviders();
      }

      function saveProviders() {
        vscode.postMessage({
          type: 'saveProviders',
          data: currentData.providers
        });
      }

      // Templates
      function renderTemplates() {
        const list = document.getElementById('templates-list');
        list.innerHTML = currentData.templates.map((template, index) => \`
          <div class="form-group">
            <div class="form-field">
              <label>テンプレート名</label>
              <input type="text" value="\${escapeHtml(template.name)}" 
                onchange="updateTemplateName(\${index}, this.value)">
            </div>
            <div class="form-field">
              <label>説明</label>
              <textarea onchange="updateTemplateDescription(\${index}, this.value)">\${escapeHtml(template.description || '')}</textarea>
            </div>
            <div class="form-actions">
              <button class="btn btn-danger" onclick="deleteTemplate(\${index})">削除</button>
              <button class="btn btn-primary" onclick="saveTemplates()">保存</button>
            </div>
          </div>
        \`).join('');
      }

      function updateTemplateName(index, name) {
        currentData.templates[index].name = name;
      }

      function updateTemplateDescription(index, desc) {
        currentData.templates[index].description = desc;
      }

      function addTemplate() {
        currentData.templates.push({
          id: 'template-' + Date.now(),
          name: 'New Template',
          description: '',
          points: []
        });
        renderTemplates();
      }

      function deleteTemplate(index) {
        currentData.templates.splice(index, 1);
        renderTemplates();
      }

      function saveTemplates() {
        vscode.postMessage({
          type: 'saveTemplates',
          data: currentData.templates
        });
      }

      // Personas
      function renderPersonas() {
        const list = document.getElementById('personas-list');
        list.innerHTML = currentData.personas.map((persona, index) => \`
          <div class="form-group">
            <div class="form-row">
              <div class="form-field checkbox-field">
                <input type="checkbox" id="persona-enabled-\${index}" 
                  \${persona.enabled ? 'checked' : ''}
                  onchange="updatePersonaEnabled(\${index}, this.checked)">
                <label for="persona-enabled-\${index}">有効</label>
              </div>
              <div class="form-field">
                <label>ペルソナ名</label>
                <input type="text" value="\${escapeHtml(persona.name)}" 
                  onchange="updatePersonaName(\${index}, this.value)">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>トーン</label>
                <input type="text" value="\${escapeHtml(persona.tone || '')}" 
                  onchange="updatePersonaTone(\${index}, this.value)">
              </div>
              <div class="form-field">
                <label>対象読者</label>
                <input type="text" value="\${escapeHtml(persona.audience || '')}" 
                  onchange="updatePersonaAudience(\${index}, this.value)">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-danger" onclick="deletePersona(\${index})">削除</button>
              <button class="btn btn-primary" onclick="savePersonas()">保存</button>
            </div>
          </div>
        \`).join('');
      }

      function updatePersonaEnabled(index, enabled) {
        currentData.personas[index].enabled = enabled;
      }

      function updatePersonaName(index, name) {
        currentData.personas[index].name = name;
      }

      function updatePersonaTone(index, tone) {
        currentData.personas[index].tone = tone;
      }

      function updatePersonaAudience(index, audience) {
        currentData.personas[index].audience = audience;
      }

      function addPersona() {
        currentData.personas.push({
          id: 'persona-' + Date.now(),
          name: 'New Persona',
          enabled: false,
          tone: '',
          audience: '',
          parameters: {}
        });
        renderPersonas();
      }

      function deletePersona(index) {
        currentData.personas.splice(index, 1);
        renderPersonas();
      }

      function savePersonas() {
        vscode.postMessage({
          type: 'savePersonas',
          data: currentData.personas
        });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // メッセージ受信
      window.addEventListener('message', event => {
        const message = event.data;
        
        if (message.type === 'updateSettings') {
          currentData = message.data;
          renderProviders();
          renderTemplates();
          renderPersonas();
        }
      });

      // 初期レンダリング
      renderProviders();
      renderTemplates();
      renderPersonas();
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
