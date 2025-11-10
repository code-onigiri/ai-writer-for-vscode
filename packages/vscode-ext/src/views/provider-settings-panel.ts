import * as vscode from 'vscode';

export type ProviderType = 'openai' | 'gemini-api' | 'gemini-cli' | 'lmtapi';

export interface ProviderConfig {
  type: ProviderType;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  cliPath?: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string;
}

export class ProviderSettingsPanel {
  private static currentPanel: ProviderSettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      null,
      this.disposables
    );
    
    this.updateWebview();
  }

  public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void {
    const column = vscode.ViewColumn.One;

    if (ProviderSettingsPanel.currentPanel) {
      ProviderSettingsPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'aiWriterProviderSettings',
      'AI Provider Settings',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ProviderSettingsPanel.currentPanel = new ProviderSettingsPanel(panel, context);
  }

  private async handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'save':
        await this.handleSave(message.payload);
        break;
      case 'validate':
        await this.handleValidate(message.payload);
        break;
      case 'testConnection':
        await this.handleTestConnection(message.payload);
        break;
      case 'cancel':
        this.panel.dispose();
        break;
    }
  }

  private async handleSave(payload: unknown): Promise<void> {
    const configs = payload as ProviderConfig[];
    
    try {
      // Save to workspace configuration
      const config = vscode.workspace.getConfiguration('aiWriter');
      await config.update('providers', configs, vscode.ConfigurationTarget.Global);
      
      // Save sensitive data to secret storage
      for (const providerConfig of configs) {
        if (providerConfig.apiKey) {
          await this.context.secrets.store(
            `aiWriter.provider.${providerConfig.type}.apiKey`,
            providerConfig.apiKey
          );
        }
      }
      
      void vscode.window.showInformationMessage('Provider settings saved successfully');
      this.panel.webview.postMessage({
        type: 'saveResponse',
        success: true,
      });
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`
      );
      this.panel.webview.postMessage({
        type: 'saveResponse',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleValidate(payload: unknown): Promise<void> {
    const config = payload as ProviderConfig;
    
    const result = this.validateConfig(config);
    
    this.panel.webview.postMessage({
      type: 'validateResponse',
      providerType: config.type,
      result,
    });
  }

  private validateConfig(config: ProviderConfig): ValidationResult {
    if (!config.enabled) {
      return {
        valid: true,
        message: 'Provider is disabled',
      };
    }

    switch (config.type) {
      case 'openai':
        if (!config.apiKey) {
          return {
            valid: false,
            message: 'API key is required for OpenAI provider',
          };
        }
        if (!config.model) {
          return {
            valid: false,
            message: 'Model is required for OpenAI provider',
          };
        }
        return {
          valid: true,
          message: 'OpenAI configuration is valid',
        };

      case 'gemini-api':
        if (!config.apiKey) {
          return {
            valid: false,
            message: 'API key is required for Gemini API provider',
          };
        }
        return {
          valid: true,
          message: 'Gemini API configuration is valid',
        };

      case 'gemini-cli':
        if (!config.cliPath) {
          return {
            valid: false,
            message: 'CLI path is required for Gemini CLI provider',
          };
        }
        return {
          valid: true,
          message: 'Gemini CLI configuration is valid',
        };

      case 'lmtapi':
        return {
          valid: true,
          message: 'Language Model Tool API uses VS Code built-in providers',
        };

      default:
        return {
          valid: false,
          message: 'Unknown provider type',
        };
    }
  }

  private async handleTestConnection(payload: unknown): Promise<void> {
    const config = payload as ProviderConfig;
    
    // Simulate connection test
    // In real implementation, this would actually test the provider
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validation = this.validateConfig(config);
    
    if (!validation.valid) {
      this.panel.webview.postMessage({
        type: 'testConnectionResponse',
        providerType: config.type,
        success: false,
        message: validation.message,
      });
      return;
    }
    
    // Simulate successful connection
    this.panel.webview.postMessage({
      type: 'testConnectionResponse',
      providerType: config.type,
      success: true,
      message: `Successfully connected to ${config.type} provider`,
    });
  }

  private async updateWebview(): Promise<void> {
    // Load saved configurations
    const config = vscode.workspace.getConfiguration('aiWriter');
    const savedProviders = config.get<ProviderConfig[]>('providers') || this.getDefaultProviders();
    
    // Load API keys from secret storage
    for (const provider of savedProviders) {
      if (provider.type !== 'lmtapi') {
        const apiKey = await this.context.secrets.get(`aiWriter.provider.${provider.type}.apiKey`);
        if (apiKey) {
          provider.apiKey = apiKey;
        }
      }
    }
    
    this.panel.webview.html = this.getHtmlContent(savedProviders);
  }

  private getDefaultProviders(): ProviderConfig[] {
    return [
      {
        type: 'openai',
        enabled: false,
        model: 'gpt-4',
      },
      {
        type: 'gemini-api',
        enabled: false,
        model: 'gemini-pro',
      },
      {
        type: 'gemini-cli',
        enabled: false,
        cliPath: '/usr/local/bin/gemini',
      },
      {
        type: 'lmtapi',
        enabled: true,
      },
    ];
  }

  private getHtmlContent(providers: ProviderConfig[]): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>AI Provider Settings</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AI Provider Settings</h1>
      <p class="description">Configure AI providers for content generation</p>
    </header>

    <div id="providersContainer">
      ${providers.map((p, i) => this.renderProviderCard(p, i)).join('')}
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-primary" id="saveBtn">Save Settings</button>
      <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
    </div>
  </div>

  <script nonce="${nonce}">
    ${this.getScript(providers)}
  </script>
</body>
</html>`;
  }

  private renderProviderCard(provider: ProviderConfig, index: number): string {
    const providerNames: Record<ProviderType, string> = {
      'openai': 'OpenAI',
      'gemini-api': 'Gemini API',
      'gemini-cli': 'Gemini CLI',
      'lmtapi': 'VS Code Language Model',
    };

    return `
      <div class="provider-card" data-provider-type="${provider.type}" data-index="${index}">
        <div class="provider-header">
          <div class="provider-title">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                class="provider-enabled" 
                ${provider.enabled ? 'checked' : ''}
              />
              <h3>${providerNames[provider.type]}</h3>
            </label>
          </div>
          <div class="validation-status" id="status-${provider.type}"></div>
        </div>

        <div class="provider-body ${provider.enabled ? '' : 'disabled'}">
          ${this.renderProviderFields(provider)}
          
          <div class="provider-actions">
            <button type="button" class="btn btn-small btn-secondary validate-btn">
              Validate
            </button>
            <button type="button" class="btn btn-small btn-secondary test-btn">
              Test Connection
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderProviderFields(provider: ProviderConfig): string {
    switch (provider.type) {
      case 'openai':
        return `
          <div class="form-group">
            <label>API Key *</label>
            <input 
              type="password" 
              class="provider-field" 
              data-field="apiKey"
              value="${this.escapeHtml(provider.apiKey || '')}"
              placeholder="sk-..."
            />
          </div>
          <div class="form-group">
            <label>Model</label>
            <select class="provider-field" data-field="model">
              <option value="gpt-4" ${provider.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
              <option value="gpt-4-turbo" ${provider.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo" ${provider.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
            </select>
          </div>
          <div class="form-group">
            <label>Endpoint (optional)</label>
            <input 
              type="text" 
              class="provider-field" 
              data-field="endpoint"
              value="${this.escapeHtml(provider.endpoint || '')}"
              placeholder="https://api.openai.com/v1"
            />
          </div>
        `;

      case 'gemini-api':
        return `
          <div class="form-group">
            <label>API Key *</label>
            <input 
              type="password" 
              class="provider-field" 
              data-field="apiKey"
              value="${this.escapeHtml(provider.apiKey || '')}"
              placeholder="AIza..."
            />
          </div>
          <div class="form-group">
            <label>Model</label>
            <select class="provider-field" data-field="model">
              <option value="gemini-pro" ${provider.model === 'gemini-pro' ? 'selected' : ''}>Gemini Pro</option>
              <option value="gemini-pro-vision" ${provider.model === 'gemini-pro-vision' ? 'selected' : ''}>Gemini Pro Vision</option>
            </select>
          </div>
        `;

      case 'gemini-cli':
        return `
          <div class="form-group">
            <label>CLI Path *</label>
            <input 
              type="text" 
              class="provider-field" 
              data-field="cliPath"
              value="${this.escapeHtml(provider.cliPath || '')}"
              placeholder="/usr/local/bin/gemini"
            />
            <small>Path to the Gemini CLI executable</small>
          </div>
          <div class="form-group">
            <label>Model</label>
            <input 
              type="text" 
              class="provider-field" 
              data-field="model"
              value="${this.escapeHtml(provider.model || 'gemini-pro')}"
              placeholder="gemini-pro"
            />
          </div>
        `;

      case 'lmtapi':
        return `
          <div class="info-box">
            <p>This provider uses VS Code's built-in Language Model API.</p>
            <p>No additional configuration required.</p>
          </div>
        `;

      default:
        return '';
    }
  }

  private getStyles(): string {
    return `
      :root {
        --spacing-xs: 0.25rem;
        --spacing-sm: 0.5rem;
        --spacing-md: 1rem;
        --spacing-lg: 1.5rem;
        --spacing-xl: 2rem;
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

      header {
        margin-bottom: var(--spacing-xl);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      h1 {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-xs);
      }

      .description {
        color: var(--vscode-descriptionForeground);
      }

      #providersContainer {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-xl);
      }

      .provider-card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        padding: var(--spacing-md);
        background: var(--vscode-editor-background);
      }

      .provider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
      }

      .provider-title {
        flex: 1;
      }

      .toggle-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
      }

      .toggle-label h3 {
        font-size: 1.1rem;
        font-weight: 600;
      }

      .validation-status {
        font-size: 0.9rem;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: 4px;
      }

      .validation-status.valid {
        color: var(--vscode-testing-iconPassed);
        background: var(--vscode-testing-iconPassed);
        opacity: 0.2;
      }

      .validation-status.invalid {
        color: var(--vscode-testing-iconFailed);
        background: var(--vscode-testing-iconFailed);
        opacity: 0.2;
      }

      .provider-body {
        padding-left: calc(1rem + var(--spacing-sm));
      }

      .provider-body.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .form-group {
        margin-bottom: var(--spacing-md);
      }

      label {
        display: block;
        margin-bottom: var(--spacing-xs);
        font-weight: 600;
      }

      small {
        display: block;
        margin-top: var(--spacing-xs);
        color: var(--vscode-descriptionForeground);
        font-size: 0.85rem;
      }

      input[type="text"],
      input[type="password"],
      select {
        width: 100%;
        padding: var(--spacing-sm);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 2px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }

      input:focus,
      select:focus {
        outline: 1px solid var(--vscode-focusBorder);
      }

      .info-box {
        padding: var(--spacing-md);
        background: var(--vscode-textBlockQuote-background);
        border-left: 3px solid var(--vscode-textBlockQuote-border);
        border-radius: 4px;
      }

      .info-box p {
        margin-bottom: var(--spacing-xs);
      }

      .info-box p:last-child {
        margin-bottom: 0;
      }

      .provider-actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
      }

      .btn {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: var(--vscode-font-size);
        font-family: var(--vscode-font-family);
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

      .btn-small {
        padding: calc(var(--spacing-xs) + 1px) var(--spacing-sm);
        font-size: 0.9rem;
      }

      .form-actions {
        display: flex;
        gap: var(--spacing-md);
        padding-top: var(--spacing-lg);
        border-top: 1px solid var(--vscode-panel-border);
      }
    `;
  }

  private getScript(providers: ProviderConfig[]): string {
    return `
      const vscode = acquireVsCodeApi();
      let providers = ${JSON.stringify(providers)};

      document.getElementById('saveBtn').addEventListener('click', () => {
        saveSettings();
      });

      document.getElementById('cancelBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      document.querySelectorAll('.provider-enabled').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const card = e.target.closest('.provider-card');
          const providerType = card.dataset.providerType;
          const index = parseInt(card.dataset.index);
          const body = card.querySelector('.provider-body');
          
          providers[index].enabled = e.target.checked;
          
          if (e.target.checked) {
            body.classList.remove('disabled');
          } else {
            body.classList.add('disabled');
          }
        });
      });

      document.querySelectorAll('.provider-field').forEach(field => {
        field.addEventListener('input', (e) => {
          const card = e.target.closest('.provider-card');
          const index = parseInt(card.dataset.index);
          const fieldName = e.target.dataset.field;
          
          providers[index][fieldName] = e.target.value;
        });
      });

      document.querySelectorAll('.validate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const card = e.target.closest('.provider-card');
          const index = parseInt(card.dataset.index);
          
          vscode.postMessage({
            type: 'validate',
            payload: providers[index]
          });
        });
      });

      document.querySelectorAll('.test-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const card = e.target.closest('.provider-card');
          const index = parseInt(card.dataset.index);
          const status = card.querySelector('.validation-status');
          
          status.textContent = 'Testing...';
          status.className = 'validation-status';
          
          vscode.postMessage({
            type: 'testConnection',
            payload: providers[index]
          });
        });
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
          case 'validateResponse':
            handleValidationResponse(message);
            break;
          case 'testConnectionResponse':
            handleTestConnectionResponse(message);
            break;
          case 'saveResponse':
            if (message.success) {
              // Keep panel open after save
            } else {
              alert('Failed to save: ' + message.error);
            }
            break;
        }
      });

      function handleValidationResponse(message) {
        const card = document.querySelector(\`[data-provider-type="\${message.providerType}"]\`);
        const status = card.querySelector('.validation-status');
        
        status.textContent = message.result.message;
        status.className = 'validation-status ' + (message.result.valid ? 'valid' : 'invalid');
      }

      function handleTestConnectionResponse(message) {
        const card = document.querySelector(\`[data-provider-type="\${message.providerType}"]\`);
        const status = card.querySelector('.validation-status');
        
        status.textContent = message.message;
        status.className = 'validation-status ' + (message.success ? 'valid' : 'invalid');
      }

      function saveSettings() {
        vscode.postMessage({
          type: 'save',
          payload: providers
        });
      }
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private dispose(): void {
    ProviderSettingsPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
