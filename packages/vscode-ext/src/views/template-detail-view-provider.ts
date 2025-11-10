import * as vscode from 'vscode';

import type { TemplateDescriptorLike, TemplateRegistryLike } from '../commands/types.js';

export class TemplateDetailViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly registry?: TemplateRegistryLike,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    this.view.webview.options = {
      enableScripts: false,
    };

    this.view.webview.html = this.renderPlaceholder();
  }

  async showTemplate(templateId: string): Promise<void> {
    if (!this.registry) {
      this.updateViewWithMessage('Template registry not available.');
      return;
    }

    const templateResult = await this.registry.loadTemplate(templateId);
    if (templateResult.kind === 'err' || !templateResult.value) {
      const message = templateResult.kind === 'err'
        ? templateResult.error.message
        : `Template ${templateId} not found.`;
      this.updateViewWithMessage(message);
      return;
    }

    this.ensureViewVisible();
    this.updateViewWithTemplate(templateResult.value);
  }

  private ensureViewVisible(): void {
    if (!this.view) {
      return;
    }

    this.view.show?.(true);
  }

  private updateViewWithMessage(message: string): void {
    if (!this.view) {
      return;
    }

    this.view.webview.html = this.renderHtml(`
      <section class="empty">
        <p>${this.escapeHtml(message)}</p>
      </section>
    `);
  }

  private updateViewWithTemplate(template: TemplateDescriptorLike): void {
    if (!this.view) {
      return;
    }

    const points = template.points
      .map((point) => {
        return `
          <article class="point">
            <header>
              <h3>${this.escapeHtml(point.title)}</h3>
              <span class="priority">Priority ${point.priority}</span>
            </header>
            <p>${this.escapeHtml(point.instructions)}</p>
          </article>
        `;
      })
      .join('');

    const personaHints = template.metadata.personaHints.length > 0
      ? template.metadata.personaHints.map((hint) => `<li>${this.escapeHtml(hint)}</li>`).join('')
      : '<li>No persona hints</li>';

    this.view.webview.html = this.renderHtml(`
      <section class="template">
        <header>
          <h2>${this.escapeHtml(template.name)}</h2>
          <p class="meta">
            <span>Template ID: ${this.escapeHtml(template.id)}</span>
            <span>Updated: ${new Date(template.metadata.updatedAt).toLocaleString()}</span>
          </p>
          <ul class="persona-hints">${personaHints}</ul>
        </header>
        <div class="points">${points}</div>
      </section>
    `);
  }

  private renderPlaceholder(): string {
    return this.renderHtml(`
      <section class="empty">
        <h2>AI Writer Template Details</h2>
        <p>Select a template from the AI Writer Templates view to see details.</p>
      </section>
    `);
  }

  private renderHtml(body: string): string {
    const nonce = Date.now().toString();
    const styles = this.getStyles();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style nonce="${nonce}">${styles}</style>
</head>
<body>
  ${body}
</body>
</html>`;
  }

  private getStyles(): string {
    return `
      :root {
        color-scheme: light dark;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        line-height: 1.4;
        padding: 0;
        margin: 0;
      }

      body {
        padding: 0.8rem;
      }

      h2 {
        margin-top: 0;
      }

      .meta {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 0.5rem;
      }

      .persona-hints {
        margin: 0.5rem 0 1rem;
        padding-left: 1.2rem;
      }

      .point {
        border: 1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0.18));
        border-radius: 6px;
        padding: 0.5rem 0.7rem;
        margin-bottom: 0.6rem;
        background: var(--vscode-editor-background);
      }

      .point header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .point h3 {
        margin: 0;
        font-size: 1rem;
      }

      .priority {
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
      }

      .empty {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
