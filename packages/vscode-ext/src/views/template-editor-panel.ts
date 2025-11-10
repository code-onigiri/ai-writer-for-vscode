import * as vscode from 'vscode';

import type { TemplateDescriptorLike, TemplatePointLike, TemplateRegistryLike } from '../commands/types.js';

export class TemplateEditorPanel {
  private static currentPanel: TemplateEditorPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly registry: TemplateRegistryLike,
    private template: TemplateDescriptorLike | null = null
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
    
    if (template) {
      this.updateWebview();
    } else {
      this.showNewTemplateForm();
    }
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    registry: TemplateRegistryLike,
    template?: TemplateDescriptorLike
  ): void {
    const column = vscode.ViewColumn.One;

    if (TemplateEditorPanel.currentPanel) {
      TemplateEditorPanel.currentPanel.panel.reveal(column);
      if (template) {
        TemplateEditorPanel.currentPanel.template = template;
        TemplateEditorPanel.currentPanel.updateWebview();
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'aiWriterTemplateEditor',
      template ? `Edit Template: ${template.name}` : 'New Template',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    TemplateEditorPanel.currentPanel = new TemplateEditorPanel(panel, registry, template ?? null);
  }

  private async handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'save':
        await this.handleSave(message.payload);
        break;
      case 'addPoint':
        await this.handleAddPoint();
        break;
      case 'removePoint':
        await this.handleRemovePoint(message.payload);
        break;
      case 'updatePoint':
        await this.handleUpdatePoint(message.payload);
        break;
      case 'cancel':
        this.panel.dispose();
        break;
    }
  }

  private async handleSave(payload: unknown): Promise<void> {
    const data = payload as {
      name: string;
      personaHints: string[];
      points: { id: string; title: string; instructions: string; priority: number }[];
    };

    try {
      if (this.template) {
        // Update existing template
        const result = await this.registry.updateTemplate(this.template.id, {
          name: data.name,
          points: data.points,
          personaHints: data.personaHints,
        });

        if (result.kind === 'ok') {
          void vscode.window.showInformationMessage('Template updated successfully');
          this.template = result.value;
          this.updateWebview();
        } else {
          void vscode.window.showErrorMessage(`Failed to update template: ${result.error.message}`);
        }
      } else {
        // Create new template
        const result = await this.registry.createTemplate({
          name: data.name,
          points: data.points,
          personaHints: data.personaHints,
        });

        if (result.kind === 'ok') {
          void vscode.window.showInformationMessage('Template created successfully');
          this.template = result.value;
          this.panel.title = `Edit Template: ${result.value.name}`;
          this.updateWebview();
        } else {
          void vscode.window.showErrorMessage(`Failed to create template: ${result.error.message}`);
        }
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleAddPoint(): Promise<void> {
    this.panel.webview.postMessage({
      type: 'addPointResponse',
      point: {
        id: `point-${Date.now()}`,
        title: 'New Point',
        instructions: '',
        priority: (this.template?.points.length ?? 0) * 10 + 10,
      },
    });
  }

  private async handleRemovePoint(payload: unknown): Promise<void> {
    const { pointId } = payload as { pointId: string };
    this.panel.webview.postMessage({
      type: 'removePointResponse',
      pointId,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleUpdatePoint(_payload: unknown): Promise<void> {
    // Point updates are handled in the webview
    // This is just for future server-side validation if needed
  }

  private showNewTemplateForm(): void {
    this.panel.webview.html = this.getHtmlContent({
      name: '',
      personaHints: [],
      points: [],
    });
  }

  private updateWebview(): void {
    if (!this.template) {
      this.showNewTemplateForm();
      return;
    }

    this.panel.webview.html = this.getHtmlContent({
      name: this.template.name,
      personaHints: this.template.metadata.personaHints,
      points: this.template.points,
    });
  }

  private getHtmlContent(data: {
    name: string;
    personaHints: readonly string[];
    points: readonly TemplatePointLike[];
  }): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Template Editor</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${this.template ? 'Edit Template' : 'Create New Template'}</h1>
    </header>

    <form id="templateForm">
      <div class="form-group">
        <label for="name">Template Name *</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          value="${this.escapeHtml(data.name)}" 
          required
          placeholder="e.g., Blog Post Template"
        />
      </div>

      <div class="form-group">
        <label for="personaHints">Persona Hints (comma-separated)</label>
        <input 
          type="text" 
          id="personaHints" 
          name="personaHints" 
          value="${this.escapeHtml(data.personaHints.join(', '))}"
          placeholder="e.g., professional tone, technical audience"
        />
      </div>

      <div class="form-group">
        <div class="section-header">
          <h2>Template Points</h2>
          <button type="button" class="btn btn-secondary" id="addPointBtn">+ Add Point</button>
        </div>
        
        <div id="pointsList">
          ${this.renderPoints(data.points)}
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save Template</button>
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

  private renderPoints(points: readonly TemplatePointLike[]): string {
    if (points.length === 0) {
      return '<p class="empty-state">No points yet. Click "Add Point" to create one.</p>';
    }

    return points
      .map(
        (point, index) => `
      <div class="point-item" data-point-id="${this.escapeHtml(point.id)}">
        <div class="point-header">
          <span class="point-number">${index + 1}</span>
          <input 
            type="text" 
            class="point-title" 
            value="${this.escapeHtml(point.title)}" 
            placeholder="Point title"
            data-field="title"
          />
          <button type="button" class="btn-icon btn-remove" title="Remove point">×</button>
        </div>
        <div class="point-body">
          <label>Instructions:</label>
          <textarea 
            class="point-instructions" 
            placeholder="Describe what should be written in this section..."
            data-field="instructions"
            rows="3"
          >${this.escapeHtml(point.instructions)}</textarea>
          <div class="point-footer">
            <label>Priority:</label>
            <input 
              type="number" 
              class="point-priority" 
              value="${point.priority}" 
              min="1" 
              step="1"
              data-field="priority"
            />
          </div>
        </div>
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
        max-width: 900px;
        margin: 0 auto;
      }

      header {
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      h1 {
        font-size: 1.5rem;
      }

      h2 {
        font-size: 1.1rem;
      }

      .form-group {
        margin-bottom: var(--spacing-lg);
      }

      label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-weight: 600;
      }

      input[type="text"],
      input[type="number"],
      textarea {
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
      textarea:focus {
        outline: 1px solid var(--vscode-focusBorder);
      }

      textarea {
        resize: vertical;
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

      .btn-remove {
        font-size: 2rem;
        line-height: 1;
      }

      .form-actions {
        display: flex;
        gap: var(--spacing-md);
        margin-top: var(--spacing-xl);
        padding-top: var(--spacing-lg);
        border-top: 1px solid var(--vscode-panel-border);
      }

      #pointsList {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .point-item {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        padding: var(--spacing-md);
        background: var(--vscode-editor-background);
      }

      .point-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
      }

      .point-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 50%;
        font-weight: 600;
        flex-shrink: 0;
      }

      .point-title {
        flex: 1;
        font-weight: 600;
      }

      .point-body {
        padding-left: 2.5rem;
      }

      .point-instructions {
        margin-top: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
      }

      .point-footer {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .point-footer label {
        margin: 0;
        font-weight: normal;
      }

      .point-priority {
        width: 100px;
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
    personaHints: readonly string[];
    points: readonly TemplatePointLike[];
  }): string {
    return `
      const vscode = acquireVsCodeApi();
      let points = ${JSON.stringify(data.points)};

      document.getElementById('templateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTemplate();
      });

      document.getElementById('cancelBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      document.getElementById('addPointBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'addPoint' });
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
          case 'addPointResponse':
            addPoint(message.point);
            break;
          case 'removePointResponse':
            removePointFromDOM(message.pointId);
            break;
        }
      });

      document.getElementById('pointsList').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
          const pointItem = e.target.closest('.point-item');
          const pointId = pointItem.dataset.pointId;
          
          // Update points array
          points = points.filter(p => p.id !== pointId);
          
          // Remove from DOM
          pointItem.remove();
          
          // Update numbering
          updatePointNumbers();
          
          // If no points left, show empty state
          if (points.length === 0) {
            showEmptyState();
          }
        }
      });

      document.getElementById('pointsList').addEventListener('input', (e) => {
        const target = e.target;
        if (!target.dataset.field) return;
        
        const pointItem = target.closest('.point-item');
        const pointId = pointItem.dataset.pointId;
        const field = target.dataset.field;
        
        const point = points.find(p => p.id === pointId);
        if (point) {
          if (field === 'priority') {
            point[field] = parseInt(target.value) || 0;
          } else {
            point[field] = target.value;
          }
        }
      });

      function addPoint(point) {
        points.push(point);
        
        const pointsList = document.getElementById('pointsList');
        
        // Remove empty state if present
        const emptyState = pointsList.querySelector('.empty-state');
        if (emptyState) {
          emptyState.remove();
        }
        
        // Add new point
        const pointHtml = createPointHTML(point, points.length - 1);
        pointsList.insertAdjacentHTML('beforeend', pointHtml);
      }

      function removePointFromDOM(pointId) {
        const pointItem = document.querySelector(\`[data-point-id="\${pointId}"]\`);
        if (pointItem) {
          pointItem.remove();
        }
      }

      function createPointHTML(point, index) {
        return \`
          <div class="point-item" data-point-id="\${escapeHtml(point.id)}">
            <div class="point-header">
              <span class="point-number">\${index + 1}</span>
              <input 
                type="text" 
                class="point-title" 
                value="\${escapeHtml(point.title)}" 
                placeholder="Point title"
                data-field="title"
              />
              <button type="button" class="btn-icon btn-remove" title="Remove point">×</button>
            </div>
            <div class="point-body">
              <label>Instructions:</label>
              <textarea 
                class="point-instructions" 
                placeholder="Describe what should be written in this section..."
                data-field="instructions"
                rows="3"
              >\${escapeHtml(point.instructions)}</textarea>
              <div class="point-footer">
                <label>Priority:</label>
                <input 
                  type="number" 
                  class="point-priority" 
                  value="\${point.priority}" 
                  min="1" 
                  step="1"
                  data-field="priority"
                />
              </div>
            </div>
          </div>
        \`;
      }

      function updatePointNumbers() {
        const pointItems = document.querySelectorAll('.point-item');
        pointItems.forEach((item, index) => {
          const numberSpan = item.querySelector('.point-number');
          if (numberSpan) {
            numberSpan.textContent = index + 1;
          }
        });
      }

      function showEmptyState() {
        const pointsList = document.getElementById('pointsList');
        pointsList.innerHTML = '<p class="empty-state">No points yet. Click "Add Point" to create one.</p>';
      }

      function saveTemplate() {
        const name = document.getElementById('name').value.trim();
        if (!name) {
          alert('Template name is required');
          return;
        }

        const personaHintsRaw = document.getElementById('personaHints').value.trim();
        const personaHints = personaHintsRaw
          ? personaHintsRaw.split(',').map(h => h.trim()).filter(h => h.length > 0)
          : [];

        vscode.postMessage({
          type: 'save',
          payload: {
            name,
            personaHints,
            points: points.map((p, index) => ({
              ...p,
              priority: p.priority || (index + 1) * 10
            }))
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
    TemplateEditorPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
