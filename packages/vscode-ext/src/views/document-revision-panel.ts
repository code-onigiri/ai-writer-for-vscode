import * as vscode from 'vscode';

export interface RevisionSuggestion {
  id: string;
  section: string;
  original: string;
  suggested: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export class DocumentRevisionPanel {
  private static currentPanel: DocumentRevisionPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private suggestions: RevisionSuggestion[] = [];
  private editor: vscode.TextEditor | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    editor: vscode.TextEditor
  ) {
    this.panel = panel;
    this.editor = editor;
    
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      null,
      this.disposables
    );
    
    // Generate initial suggestions
    this.generateSuggestions();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static createOrShow(_extensionUri: vscode.Uri): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage('No active text editor');
      return;
    }

    const column = vscode.ViewColumn.Beside;

    if (DocumentRevisionPanel.currentPanel) {
      DocumentRevisionPanel.currentPanel.panel.reveal(column);
      DocumentRevisionPanel.currentPanel.editor = editor;
      DocumentRevisionPanel.currentPanel.generateSuggestions();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'aiWriterDocumentRevision',
      'Document Revision',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    DocumentRevisionPanel.currentPanel = new DocumentRevisionPanel(panel, editor);
  }

  private async handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'accept':
        await this.handleAccept(message.payload);
        break;
      case 'reject':
        await this.handleReject(message.payload);
        break;
      case 'acceptAll':
        await this.handleAcceptAll();
        break;
      case 'rejectAll':
        await this.handleRejectAll();
        break;
      case 'highlight':
        await this.handleHighlight(message.payload);
        break;
      case 'regenerate':
        await this.handleRegenerate();
        break;
      case 'close':
        this.panel.dispose();
        break;
    }
  }

  private async handleAccept(payload: unknown): Promise<void> {
    const { suggestionId } = payload as { suggestionId: string };
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion || !this.editor) {
      return;
    }

    suggestion.status = 'accepted';
    
    // Apply the change to the document
    const document = this.editor.document;
    const text = document.getText();
    const originalIndex = text.indexOf(suggestion.original);
    
    if (originalIndex !== -1) {
      await this.editor.edit(editBuilder => {
        const startPos = document.positionAt(originalIndex);
        const endPos = document.positionAt(originalIndex + suggestion.original.length);
        editBuilder.replace(new vscode.Range(startPos, endPos), suggestion.suggested);
      });
      
      void vscode.window.showInformationMessage('Suggestion applied');
    }
    
    this.updateWebview();
  }

  private async handleReject(payload: unknown): Promise<void> {
    const { suggestionId } = payload as { suggestionId: string };
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    
    if (suggestion) {
      suggestion.status = 'rejected';
      this.updateWebview();
    }
  }

  private async handleAcceptAll(): Promise<void> {
    if (!this.editor) {
      return;
    }

    const pendingSuggestions = this.suggestions.filter(s => s.status === 'pending');
    
    for (const suggestion of pendingSuggestions) {
      suggestion.status = 'accepted';
      
      const document = this.editor.document;
      const text = document.getText();
      const originalIndex = text.indexOf(suggestion.original);
      
      if (originalIndex !== -1) {
        await this.editor.edit(editBuilder => {
          const startPos = document.positionAt(originalIndex);
          const endPos = document.positionAt(originalIndex + suggestion.original.length);
          editBuilder.replace(new vscode.Range(startPos, endPos), suggestion.suggested);
        });
      }
    }
    
    void vscode.window.showInformationMessage(`Applied ${pendingSuggestions.length} suggestions`);
    this.updateWebview();
  }

  private async handleRejectAll(): Promise<void> {
    const pendingSuggestions = this.suggestions.filter(s => s.status === 'pending');
    
    for (const suggestion of pendingSuggestions) {
      suggestion.status = 'rejected';
    }
    
    this.updateWebview();
  }

  private async handleHighlight(payload: unknown): Promise<void> {
    const { suggestionId } = payload as { suggestionId: string };
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion || !this.editor) {
      return;
    }

    const document = this.editor.document;
    const text = document.getText();
    const originalIndex = text.indexOf(suggestion.original);
    
    if (originalIndex !== -1) {
      const startPos = document.positionAt(originalIndex);
      const endPos = document.positionAt(originalIndex + suggestion.original.length);
      const range = new vscode.Range(startPos, endPos);
      
      this.editor.selection = new vscode.Selection(startPos, endPos);
      this.editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }
  }

  private async handleRegenerate(): Promise<void> {
    void vscode.window.showInformationMessage('Regenerating suggestions...');
    this.generateSuggestions();
  }

  private generateSuggestions(): void {
    if (!this.editor) {
      return;
    }

    const document = this.editor.document;
    const text = document.getText();
    
    // For demonstration, generate some mock suggestions
    // In real implementation, this would call the AI service
    this.suggestions = this.createMockSuggestions(text);
    
    this.updateWebview();
  }

  private createMockSuggestions(text: string): RevisionSuggestion[] {
    const suggestions: RevisionSuggestion[] = [];
    
    // Example: Find long sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, index) => {
      if (sentence.trim().length > 100) {
        suggestions.push({
          id: `suggestion-${index}`,
          section: `Paragraph ${Math.floor(index / 3) + 1}`,
          original: sentence.trim() + '.',
          suggested: sentence.trim().substring(0, 80) + '... (simplified for clarity).',
          reason: 'This sentence is quite long. Consider breaking it into shorter sentences for better readability.',
          status: 'pending',
        });
      }
    });
    
    // Add a few more example suggestions
    if (text.includes('very')) {
      const veryIndex = text.indexOf('very');
      const context = text.substring(Math.max(0, veryIndex - 20), Math.min(text.length, veryIndex + 30));
      suggestions.push({
        id: 'suggestion-very',
        section: 'Introduction',
        original: context.trim(),
        suggested: context.replace('very', 'extremely').trim(),
        reason: 'Consider using a more specific adjective instead of "very".',
        status: 'pending',
      });
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions for demo
  }

  private updateWebview(): void {
    this.panel.webview.html = this.getHtmlContent(this.suggestions);
  }

  private getHtmlContent(suggestions: RevisionSuggestion[]): string {
    const nonce = this.getNonce();
    const fileName = this.editor?.document.fileName.split('/').pop() || 'document';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Document Revision</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Document Revision</h1>
      <p class="file-name">${this.escapeHtml(fileName)}</p>
    </header>

    <div class="toolbar">
      <button class="btn btn-small btn-secondary" id="regenerateBtn">
        🔄 Regenerate Suggestions
      </button>
      <div class="toolbar-actions">
        <button class="btn btn-small btn-secondary" id="acceptAllBtn">
          Accept All
        </button>
        <button class="btn btn-small btn-secondary" id="rejectAllBtn">
          Reject All
        </button>
      </div>
    </div>

    ${suggestions.length === 0 ? this.renderEmptyState() : ''}
    
    <div id="suggestionsContainer">
      ${suggestions.map(s => this.renderSuggestion(s)).join('')}
    </div>

    <div class="summary">
      <p>
        <strong>${suggestions.filter(s => s.status === 'pending').length}</strong> pending • 
        <strong>${suggestions.filter(s => s.status === 'accepted').length}</strong> accepted • 
        <strong>${suggestions.filter(s => s.status === 'rejected').length}</strong> rejected
      </p>
    </div>
  </div>

  <script nonce="${nonce}">
    ${this.getScript()}
  </script>
</body>
</html>`;
  }

  private renderEmptyState(): string {
    return `
      <div class="empty-state">
        <p>No suggestions available</p>
        <p class="empty-state-hint">The document looks good, or suggestions are being generated...</p>
      </div>
    `;
  }

  private renderSuggestion(suggestion: RevisionSuggestion): string {
    const statusClass = suggestion.status;
    const statusIcon = suggestion.status === 'accepted' ? '✓' : 
                       suggestion.status === 'rejected' ? '✗' : '⋯';

    return `
      <div class="suggestion ${statusClass}" data-suggestion-id="${suggestion.id}">
        <div class="suggestion-header">
          <span class="section-label">${this.escapeHtml(suggestion.section)}</span>
          <span class="status-icon">${statusIcon}</span>
        </div>

        <div class="suggestion-body">
          <div class="suggestion-reason">
            ${this.escapeHtml(suggestion.reason)}
          </div>

          <div class="text-comparison">
            <div class="text-original">
              <label>Original:</label>
              <div class="text-content">${this.escapeHtml(suggestion.original)}</div>
            </div>
            <div class="text-arrow">→</div>
            <div class="text-suggested">
              <label>Suggested:</label>
              <div class="text-content">${this.escapeHtml(suggestion.suggested)}</div>
            </div>
          </div>

          ${suggestion.status === 'pending' ? `
            <div class="suggestion-actions">
              <button class="btn btn-small btn-primary accept-btn">
                ✓ Accept
              </button>
              <button class="btn btn-small btn-secondary reject-btn">
                ✗ Reject
              </button>
              <button class="btn btn-small btn-secondary highlight-btn">
                📍 Highlight
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
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
        padding: var(--spacing-md);
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
      }

      header {
        margin-bottom: var(--spacing-md);
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      h1 {
        font-size: 1.3rem;
        margin-bottom: var(--spacing-xs);
      }

      .file-name {
        color: var(--vscode-descriptionForeground);
        font-size: 0.9rem;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-lg);
        padding: var(--spacing-sm);
        background: var(--vscode-textBlockQuote-background);
        border-radius: 4px;
      }

      .toolbar-actions {
        display: flex;
        gap: var(--spacing-sm);
      }

      .empty-state {
        padding: var(--spacing-xl);
        text-align: center;
        color: var(--vscode-descriptionForeground);
      }

      .empty-state p {
        margin-bottom: var(--spacing-sm);
      }

      .empty-state-hint {
        font-size: 0.9rem;
        font-style: italic;
      }

      #suggestionsContainer {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
      }

      .suggestion {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        padding: var(--spacing-md);
        background: var(--vscode-editor-background);
      }

      .suggestion.accepted {
        border-color: var(--vscode-testing-iconPassed);
        opacity: 0.7;
      }

      .suggestion.rejected {
        border-color: var(--vscode-testing-iconFailed);
        opacity: 0.7;
      }

      .suggestion-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-sm);
      }

      .section-label {
        font-size: 0.85rem;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
      }

      .status-icon {
        font-size: 1.2rem;
      }

      .suggestion-body {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .suggestion-reason {
        padding: var(--spacing-sm);
        background: var(--vscode-textBlockQuote-background);
        border-left: 3px solid var(--vscode-textBlockQuote-border);
        border-radius: 4px;
        font-size: 0.9rem;
      }

      .text-comparison {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: var(--spacing-md);
        align-items: center;
      }

      .text-original,
      .text-suggested {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .text-original label,
      .text-suggested label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
      }

      .text-content {
        padding: var(--spacing-sm);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9rem;
        line-height: 1.4;
      }

      .text-original .text-content {
        color: var(--vscode-testing-iconFailed);
      }

      .text-suggested .text-content {
        color: var(--vscode-testing-iconPassed);
      }

      .text-arrow {
        font-size: 1.5rem;
        color: var(--vscode-descriptionForeground);
      }

      .suggestion-actions {
        display: flex;
        gap: var(--spacing-sm);
        padding-top: var(--spacing-sm);
        border-top: 1px solid var(--vscode-panel-border);
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

      .summary {
        padding: var(--spacing-md);
        background: var(--vscode-textBlockQuote-background);
        border-radius: 4px;
        text-align: center;
      }

      .summary strong {
        color: var(--vscode-focusBorder);
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();

      document.getElementById('regenerateBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'regenerate' });
      });

      document.getElementById('acceptAllBtn').addEventListener('click', () => {
        if (confirm('Accept all pending suggestions?')) {
          vscode.postMessage({ type: 'acceptAll' });
        }
      });

      document.getElementById('rejectAllBtn').addEventListener('click', () => {
        if (confirm('Reject all pending suggestions?')) {
          vscode.postMessage({ type: 'rejectAll' });
        }
      });

      document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const suggestion = e.target.closest('.suggestion');
          const suggestionId = suggestion.dataset.suggestionId;
          
          vscode.postMessage({
            type: 'accept',
            payload: { suggestionId }
          });
        });
      });

      document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const suggestion = e.target.closest('.suggestion');
          const suggestionId = suggestion.dataset.suggestionId;
          
          vscode.postMessage({
            type: 'reject',
            payload: { suggestionId }
          });
        });
      });

      document.querySelectorAll('.highlight-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const suggestion = e.target.closest('.suggestion');
          const suggestionId = suggestion.dataset.suggestionId;
          
          vscode.postMessage({
            type: 'highlight',
            payload: { suggestionId }
          });
        });
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private dispose(): void {
    DocumentRevisionPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
