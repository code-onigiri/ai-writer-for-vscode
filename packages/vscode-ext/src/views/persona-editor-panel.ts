import * as vscode from 'vscode';

import type { PersonaDefinitionLike, PersonaDraftLike, PersonaManagerLike } from '../commands/types.js';

export class PersonaEditorPanel {
  private static currentPanel: PersonaEditorPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly manager: PersonaManagerLike,
    private persona: PersonaDefinitionLike | null = null
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
    
    if (persona) {
      this.updateWebview();
    } else {
      this.showNewPersonaForm();
    }
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    manager: PersonaManagerLike,
    persona?: PersonaDefinitionLike
  ): void {
    const column = vscode.ViewColumn.One;

    if (PersonaEditorPanel.currentPanel) {
      PersonaEditorPanel.currentPanel.panel.reveal(column);
      if (persona) {
        PersonaEditorPanel.currentPanel.persona = persona;
        PersonaEditorPanel.currentPanel.updateWebview();
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'aiWriterPersonaEditor',
      persona ? `Edit Persona: ${persona.name}` : 'New Persona',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    PersonaEditorPanel.currentPanel = new PersonaEditorPanel(panel, manager, persona ?? null);
  }

  private async handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'save':
        await this.handleSave(message.payload);
        break;
      case 'addToggle':
        await this.handleAddToggle();
        break;
      case 'cancel':
        this.panel.dispose();
        break;
    }
  }

  private async handleSave(payload: unknown): Promise<void> {
    const data = payload as {
      name: string;
      tone: string;
      audience: string;
      toggles: Record<string, boolean>;
      source?: string;
    };

    try {
      const draft: PersonaDraftLike = {
        name: data.name,
        tone: data.tone,
        audience: data.audience,
        toggles: data.toggles,
        source: data.source,
      };

      const result = await this.manager.upsertPersona(draft);

      if (result.kind === 'ok') {
        void vscode.window.showInformationMessage(
          this.persona ? 'Persona updated successfully' : 'Persona created successfully'
        );
        this.persona = result.value;
        this.panel.title = `Edit Persona: ${result.value.name}`;
        this.updateWebview();
      } else {
        void vscode.window.showErrorMessage(`Failed to save persona: ${result.error.message}`);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleAddToggle(): Promise<void> {
    const toggleName = await vscode.window.showInputBox({
      prompt: 'Enter toggle name',
      placeHolder: 'e.g., include_examples',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Toggle name cannot be empty';
        }
        if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
          return 'Toggle name must be alphanumeric with underscores';
        }
        return undefined;
      },
    });

    if (toggleName) {
      this.panel.webview.postMessage({
        type: 'addToggleResponse',
        toggleName: toggleName.trim(),
      });
    }
  }

  private showNewPersonaForm(): void {
    this.panel.webview.html = this.getHtmlContent({
      name: '',
      tone: '',
      audience: '',
      toggles: {},
      source: undefined,
    });
  }

  private updateWebview(): void {
    if (!this.persona) {
      this.showNewPersonaForm();
      return;
    }

    this.panel.webview.html = this.getHtmlContent({
      name: this.persona.name,
      tone: this.persona.tone,
      audience: this.persona.audience,
      toggles: (this.persona.toggles as Record<string, boolean>) ?? {},
      source: this.persona.metadata.source,
    });
  }

  private getHtmlContent(data: {
    name: string;
    tone: string;
    audience: string;
    toggles: Record<string, boolean>;
    source?: string;
  }): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Persona Editor</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${this.persona ? 'Edit Persona' : 'Create New Persona'}</h1>
      ${
        this.persona
          ? `<p class="meta">ID: ${this.escapeHtml(this.persona.id)} • Updated: ${new Date(
              this.persona.metadata.updatedAt
            ).toLocaleString()}</p>`
          : ''
      }
    </header>

    <form id="personaForm">
      <div class="form-group">
        <label for="name">Persona Name *</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          value="${this.escapeHtml(data.name)}" 
          required
          placeholder="e.g., Technical Writer"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="tone">Writing Tone *</label>
          <select id="tone" name="tone" required>
            <option value="">-- Select tone --</option>
            ${this.renderOptions(
              ['professional', 'casual', 'academic', 'technical', 'friendly', 'formal'],
              data.tone
            )}
          </select>
        </div>

        <div class="form-group">
          <label for="audience">Target Audience *</label>
          <select id="audience" name="audience" required>
            <option value="">-- Select audience --</option>
            ${this.renderOptions(
              ['developers', 'general', 'experts', 'beginners', 'business', 'students'],
              data.audience
            )}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="source">Source (optional)</label>
        <input 
          type="text" 
          id="source" 
          name="source" 
          value="${this.escapeHtml(data.source ?? '')}"
          placeholder="e.g., Interview Q&A, Style guide"
        />
        <small>Reference for where this persona's characteristics came from</small>
      </div>

      <div class="form-group">
        <div class="section-header">
          <h2>Persona Toggles</h2>
          <button type="button" class="btn btn-secondary" id="addToggleBtn">+ Add Toggle</button>
        </div>
        
        <div id="togglesList">
          ${this.renderToggles(data.toggles)}
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save Persona</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  </div>

  <script nonce="${nonce}">
    ${this.getScript(data)}
  </script>
</body>
</html>`;
  }

  private renderOptions(options: string[], selected: string): string {
    return options
      .map(
        (opt) =>
          `<option value="${this.escapeHtml(opt)}" ${
            opt === selected ? 'selected' : ''
          }>${this.escapeHtml(opt)}</option>`
      )
      .join('');
  }

  private renderToggles(toggles: Record<string, boolean>): string {
    const entries = Object.entries(toggles);

    if (entries.length === 0) {
      return '<p class="empty-state">No toggles yet. Click "Add Toggle" to create one.</p>';
    }

    return entries
      .map(
        ([name, enabled]) => `
      <div class="toggle-item" data-toggle-name="${this.escapeHtml(name)}">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            class="toggle-checkbox" 
            ${enabled ? 'checked' : ''}
          />
          <span class="toggle-name">${this.escapeHtml(name)}</span>
        </label>
        <button type="button" class="btn-icon btn-remove" title="Remove toggle">×</button>
      </div>
    `
      )
      .join('');
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
        max-width: 800px;
        margin: 0 auto;
      }

      header {
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      h1 {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-xs);
      }

      h2 {
        font-size: 1.1rem;
      }

      .meta {
        color: var(--vscode-descriptionForeground);
        font-size: 0.9rem;
      }

      .form-group {
        margin-bottom: var(--spacing-lg);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
      }

      label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-weight: 600;
      }

      small {
        display: block;
        margin-top: var(--spacing-xs);
        color: var(--vscode-descriptionForeground);
        font-size: 0.85rem;
      }

      input[type="text"],
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

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
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

      .btn-icon {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0 var(--spacing-sm);
        opacity: 0.7;
      }

      .btn-icon:hover {
        opacity: 1;
        color: var(--vscode-errorForeground);
      }

      .form-actions {
        display: flex;
        gap: var(--spacing-md);
        margin-top: var(--spacing-xl);
        padding-top: var(--spacing-lg);
        border-top: 1px solid var(--vscode-panel-border);
      }

      #togglesList {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .toggle-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        background: var(--vscode-editor-background);
      }

      .toggle-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        flex: 1;
      }

      .toggle-checkbox {
        cursor: pointer;
      }

      .toggle-name {
        font-family: var(--vscode-editor-font-family);
        font-weight: 500;
      }

      .empty-state {
        padding: var(--spacing-lg);
        text-align: center;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
    `;
  }

  private getScript(data: {
    name: string;
    tone: string;
    audience: string;
    toggles: Record<string, boolean>;
    source?: string;
  }): string {
    return `
      const vscode = acquireVsCodeApi();
      let toggles = ${JSON.stringify(data.toggles)};

      document.getElementById('personaForm').addEventListener('submit', (e) => {
        e.preventDefault();
        savePersona();
      });

      document.getElementById('cancelBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      document.getElementById('addToggleBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'addToggle' });
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        
        if (message.type === 'addToggleResponse') {
          addToggle(message.toggleName);
        }
      });

      document.getElementById('togglesList').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
          const toggleItem = e.target.closest('.toggle-item');
          const toggleName = toggleItem.dataset.toggleName;
          
          // Update toggles object
          delete toggles[toggleName];
          
          // Remove from DOM
          toggleItem.remove();
          
          // If no toggles left, show empty state
          if (Object.keys(toggles).length === 0) {
            showEmptyState();
          }
        }
      });

      document.getElementById('togglesList').addEventListener('change', (e) => {
        if (e.target.classList.contains('toggle-checkbox')) {
          const toggleItem = e.target.closest('.toggle-item');
          const toggleName = toggleItem.dataset.toggleName;
          toggles[toggleName] = e.target.checked;
        }
      });

      function addToggle(toggleName) {
        if (toggles[toggleName] !== undefined) {
          alert('Toggle with this name already exists');
          return;
        }

        toggles[toggleName] = true;
        
        const togglesList = document.getElementById('togglesList');
        
        // Remove empty state if present
        const emptyState = togglesList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }
        
        // Add new toggle
        const toggleHtml = createToggleHTML(toggleName, true);
        togglesList.insertAdjacentHTML('beforeend', toggleHtml);
      }

      function createToggleHTML(name, enabled) {
        return \`
          <div class="toggle-item" data-toggle-name="\${escapeHtml(name)}">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                class="toggle-checkbox" 
                \${enabled ? 'checked' : ''}
              />
              <span class="toggle-name">\${escapeHtml(name)}</span>
            </label>
            <button type="button" class="btn-icon btn-remove" title="Remove toggle">×</button>
          </div>
        \`;
      }

      function showEmptyState() {
        const togglesList = document.getElementById('togglesList');
        togglesList.innerHTML = '<p class="empty-state">No toggles yet. Click "Add Toggle" to create one.</p>';
      }

      function savePersona() {
        const name = document.getElementById('name').value.trim();
        const tone = document.getElementById('tone').value;
        const audience = document.getElementById('audience').value;
        const source = document.getElementById('source').value.trim();

        if (!name || !tone || !audience) {
          alert('Please fill in all required fields');
          return;
        }

        vscode.postMessage({
          type: 'save',
          payload: {
            name,
            tone,
            audience,
            toggles,
            source: source || undefined
          }
        });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    PersonaEditorPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
