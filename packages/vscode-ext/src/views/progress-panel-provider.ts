import * as vscode from 'vscode';

export type ProgressStepType = 'generate' | 'critique' | 'reflection' | 'question' | 'regenerate' | 'approval';
export type ProgressStatus = 'pending' | 'running' | 'completed' | 'error';

export interface ProgressStep {
  type: ProgressStepType;
  status: ProgressStatus;
  content?: string;
  timestamp: string;
  error?: string;
  streamedContent?: string; // リアルタイムストリーミング用の部分コンテンツ
}

export interface ProgressState {
  sessionId: string;
  mode: 'outline' | 'draft';
  currentStep: ProgressStepType | 'completed';
  steps: ProgressStep[];
  isStreaming: boolean;
  streamingStepIndex?: number; // 現在ストリーミング中のステップのインデックス
}

export class ProgressPanelProvider {
  private panel: vscode.WebviewPanel | undefined;
  private currentState: ProgressState | undefined;
  private streamBuffer = new Map<number, string>(); // ステップごとのストリームバッファ

  public show(state: ProgressState): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'aiWriterProgress',
        'AI Writer Progress',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });

      this.panel.webview.onDidReceiveMessage(
        (message) => this.handleMessage(message),
        undefined,
        []
      );
    }

    this.currentState = state;
    this.panel.webview.html = this.getHtmlContent(state);
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  public updateState(state: Partial<ProgressState>): void {
    if (!this.currentState || !this.panel) {
      return;
    }

    this.currentState = { ...this.currentState, ...state };
    this.panel.webview.postMessage({
      type: 'updateState',
      state: this.currentState,
    });
  }

  public appendStreamContent(stepType: ProgressStepType, chunk: string): void {
    if (!this.panel || !this.currentState) {
      return;
    }

    // ストリーミング中のステップを探す
    const stepIndex = this.currentState.steps.findIndex(
      s => s.type === stepType && s.status === 'running'
    );

    if (stepIndex >= 0) {
      // バッファに追加
      const currentBuffer = this.streamBuffer.get(stepIndex) || '';
      this.streamBuffer.set(stepIndex, currentBuffer + chunk);

      // Webviewに送信
      this.panel.webview.postMessage({
        type: 'streamChunk',
        stepIndex,
        stepType,
        chunk,
      });
    }
  }

  public startStreaming(stepType: ProgressStepType): void {
    if (!this.currentState || !this.panel) {
      return;
    }

    const stepIndex = this.currentState.steps.findIndex(s => s.type === stepType);
    if (stepIndex >= 0) {
      this.streamBuffer.set(stepIndex, '');
      this.currentState.isStreaming = true;
      this.currentState.streamingStepIndex = stepIndex;
      
      this.panel.webview.postMessage({
        type: 'startStreaming',
        stepIndex,
        stepType,
      });
    }
  }

  public stopStreaming(stepType: ProgressStepType, finalContent?: string): void {
    if (!this.currentState || !this.panel) {
      return;
    }

    const stepIndex = this.currentState.steps.findIndex(s => s.type === stepType);
    if (stepIndex >= 0) {
      // 最終コンテンツを設定
      const content = finalContent || this.streamBuffer.get(stepIndex) || '';
      this.currentState.steps[stepIndex].content = content;
      this.currentState.steps[stepIndex].status = 'completed';
      this.currentState.isStreaming = false;
      this.currentState.streamingStepIndex = undefined;
      
      // バッファをクリア
      this.streamBuffer.delete(stepIndex);

      this.panel.webview.postMessage({
        type: 'stopStreaming',
        stepIndex,
        stepType,
        finalContent: content,
      });
    }
  }

  public cancelStreaming(stepType: ProgressStepType, errorMessage?: string): void {
    if (!this.currentState || !this.panel) {
      return;
    }

    const stepIndex = this.currentState.steps.findIndex(s => s.type === stepType);
    if (stepIndex >= 0) {
      this.currentState.steps[stepIndex].status = 'error';
      this.currentState.steps[stepIndex].error = errorMessage || 'ストリーミングがキャンセルされました';
      this.currentState.isStreaming = false;
      this.currentState.streamingStepIndex = undefined;
      
      // バッファをクリア
      this.streamBuffer.delete(stepIndex);

      this.panel.webview.postMessage({
        type: 'cancelStreaming',
        stepIndex,
        stepType,
        error: errorMessage,
      });
    }
  }

  private handleMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'rerun':
        void vscode.commands.executeCommand('ai-writer.rerunStep', message.payload);
        break;
      case 'approve':
        void vscode.commands.executeCommand('ai-writer.approveStep', message.payload);
        break;
      case 'reject':
        void vscode.commands.executeCommand('ai-writer.rejectStep', message.payload);
        break;
    }
  }

  private getHtmlContent(state: ProgressState): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>AI Writer Progress</title>
  <style nonce="${nonce}">
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AI Writer Progress</h1>
      <div class="session-info">
        <span class="badge ${state.mode}">${state.mode}</span>
        <span class="session-id">${this.escapeHtml(state.sessionId)}</span>
      </div>
    </header>

    <div id="timeline" class="timeline">
      ${this.renderTimeline(state)}
    </div>

    ${state.isStreaming ? '<div id="streaming-indicator" class="streaming">Streaming...</div>' : ''}
  </div>

  <script nonce="${nonce}">
    ${this.getScript()}
  </script>
</body>
</html>`;
  }

  private renderTimeline(state: ProgressState): string {
    return state.steps
      .map((step, index) => {
        const isActive = step.status === 'running';
        const isCompleted = step.status === 'completed';
        const isError = step.status === 'error';

        return `
          <div class="step ${step.status} ${isActive ? 'active' : ''}" data-step-index="${index}">
            <div class="step-header">
              <div class="step-icon">
                ${this.getStepIcon(step.type, step.status)}
              </div>
              <div class="step-title">
                <h3>${this.getStepTitle(step.type)}</h3>
                <span class="step-time">${new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
              ${isCompleted && (step.type === 'generate' || step.type === 'regenerate') ? `
                <div class="step-actions">
                  <button class="btn btn-secondary" onclick="rerunStep('${step.type}', ${index})">Rerun</button>
                </div>
              ` : ''}
            </div>
            ${step.content ? `
              <div class="step-content" id="step-content-${index}">
                ${this.escapeHtml(step.content)}
              </div>
            ` : ''}
            ${isError && step.error ? `
              <div class="step-error">
                <strong>Error:</strong> ${this.escapeHtml(step.error)}
              </div>
            ` : ''}
          </div>
        `;
      })
      .join('');
  }

  private getStepIcon(type: ProgressStepType, status: ProgressStatus): string {
    if (status === 'running') {
      return '<div class="spinner"></div>';
    }
    if (status === 'error') {
      return '❌';
    }
    if (status === 'completed') {
      return '✅';
    }

    const icons: Record<ProgressStepType, string> = {
      generate: '📝',
      critique: '🔍',
      reflection: '💭',
      question: '❓',
      regenerate: '🔄',
      approval: '✓',
    };

    return icons[type] || '•';
  }

  private getStepTitle(type: ProgressStepType): string {
    const titles: Record<ProgressStepType, string> = {
      generate: 'Generate',
      critique: 'Critique',
      reflection: 'Reflection',
      question: 'Question',
      regenerate: 'Regenerate',
      approval: 'Approval',
    };

    return titles[type] || type;
  }

  private getStyles(): string {
    return `
      :root {
        --vscode-font-family: var(--vscode-font-family);
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
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      h1 {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-sm);
      }

      .session-info {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
        font-size: 0.9rem;
        color: var(--vscode-descriptionForeground);
      }

      .badge {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .badge.outline {
        background: var(--vscode-charts-blue);
        color: var(--vscode-editor-background);
      }

      .badge.draft {
        background: var(--vscode-charts-green);
        color: var(--vscode-editor-background);
      }

      .timeline {
        position: relative;
        padding-left: var(--spacing-xl);
      }

      .timeline::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--vscode-panel-border);
      }

      .step {
        position: relative;
        margin-bottom: var(--spacing-lg);
        padding: var(--spacing-md);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        background: var(--vscode-editor-background);
      }

      .step.active {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
      }

      .step.error {
        border-color: var(--vscode-inputValidation-errorBorder);
      }

      .step.streaming {
        border-color: var(--vscode-progressBar-background);
        animation: pulse-border 1.5s ease-in-out infinite;
      }

      @keyframes pulse-border {
        0%, 100% {
          border-color: var(--vscode-progressBar-background);
        }
        50% {
          border-color: var(--vscode-focusBorder);
        }
      }

      .step-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-sm);
      }

      .step-icon {
        font-size: 1.5rem;
        min-width: 1.5rem;
      }

      .step-title {
        flex: 1;
      }

      .step-title h3 {
        font-size: 1rem;
        margin-bottom: var(--spacing-xs);
      }

      .step-time {
        font-size: 0.8rem;
        color: var(--vscode-descriptionForeground);
      }

      .step-actions {
        display: flex;
        gap: var(--spacing-sm);
      }

      .btn {
        padding: var(--spacing-xs) var(--spacing-sm);
        border: 1px solid var(--vscode-button-border);
        border-radius: 4px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        cursor: pointer;
        font-size: 0.9rem;
      }

      .btn:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .btn-secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-secondary:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .step-content {
        margin-top: var(--spacing-sm);
        padding: var(--spacing-md);
        background: var(--vscode-textBlockQuote-background);
        border-left: 3px solid var(--vscode-textBlockQuote-border);
        white-space: pre-wrap;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9rem;
        line-height: 1.5;
        overflow-x: auto;
      }

      .step-error {
        margin-top: var(--spacing-sm);
        padding: var(--spacing-sm);
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        border-radius: 4px;
        color: var(--vscode-errorForeground);
        font-size: 0.9rem;
      }

      .streaming {
        position: fixed;
        top: var(--spacing-md);
        right: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 4px;
        font-size: 0.9rem;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--vscode-panel-border);
        border-top-color: var(--vscode-progressBar-background);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();
      let currentState = ${JSON.stringify(this.currentState)};

      window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
          case 'updateState':
            currentState = message.state;
            updateUI(currentState);
            break;
          case 'streamChunk':
            appendStreamChunk(message.stepIndex, message.chunk);
            break;
          case 'startStreaming':
            startStreamingUI(message.stepIndex);
            break;
          case 'stopStreaming':
            stopStreamingUI(message.stepIndex, message.finalContent);
            break;
          case 'cancelStreaming':
            cancelStreamingUI(message.stepIndex, message.error);
            break;
        }
      });

      function updateUI(state) {
        const timeline = document.getElementById('timeline');
        if (timeline) {
          timeline.innerHTML = renderTimeline(state);
        }

        const streamingIndicator = document.getElementById('streaming-indicator');
        if (streamingIndicator) {
          streamingIndicator.style.display = state.isStreaming ? 'block' : 'none';
        }
      }

      function renderTimeline(state) {
        return state.steps.map((step, index) => {
          return \`<div class="step \${step.status}" id="step-\${index}">
            <div class="step-header">
              <div class="step-icon">\${getStepIcon(step.type, step.status)}</div>
              <div class="step-title">
                <h3>\${getStepTitle(step.type)}</h3>
                <span class="step-time">\${new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            \${step.content || step.status === 'running' ? \`<div class="step-content" id="step-content-\${index}">\${escapeHtml(step.content || '')}</div>\` : ''}
            \${step.error ? \`<div class="step-error"><strong>Error:</strong> \${escapeHtml(step.error)}</div>\` : ''}
          </div>\`;
        }).join('');
      }

      function appendStreamChunk(stepIndex, chunk) {
        let contentElement = document.getElementById(\`step-content-\${stepIndex}\`);
        
        // コンテンツ要素がまだなければ作成
        if (!contentElement) {
          const stepElement = document.getElementById(\`step-\${stepIndex}\`);
          if (stepElement) {
            const headerElement = stepElement.querySelector('.step-header');
            if (headerElement) {
              contentElement = document.createElement('div');
              contentElement.className = 'step-content';
              contentElement.id = \`step-content-\${stepIndex}\`;
              headerElement.insertAdjacentElement('afterend', contentElement);
            }
          }
        }

        if (contentElement) {
          contentElement.textContent += chunk;
          // 自動スクロール
          contentElement.scrollTop = contentElement.scrollHeight;
          
          // ステップ全体も表示領域にスクロール
          const stepElement = document.getElementById(\`step-\${stepIndex}\`);
          if (stepElement) {
            stepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      function startStreamingUI(stepIndex) {
        const streamingIndicator = document.getElementById('streaming-indicator');
        if (streamingIndicator) {
          streamingIndicator.style.display = 'block';
        }
        
        // ステップをハイライト
        const stepElement = document.getElementById(\`step-\${stepIndex}\`);
        if (stepElement) {
          stepElement.classList.add('active', 'streaming');
        }
      }

      function stopStreamingUI(stepIndex, finalContent) {
        const streamingIndicator = document.getElementById('streaming-indicator');
        if (streamingIndicator) {
          streamingIndicator.style.display = 'none';
        }
        
        // ステップの状態を更新
        const stepElement = document.getElementById(\`step-\${stepIndex}\`);
        if (stepElement) {
          stepElement.classList.remove('streaming');
          stepElement.classList.add('completed');
        }
        
        // 最終コンテンツを設定
        const contentElement = document.getElementById(\`step-content-\${stepIndex}\`);
        if (contentElement && finalContent !== undefined) {
          contentElement.textContent = finalContent;
        }
      }

      function cancelStreamingUI(stepIndex, error) {
        const streamingIndicator = document.getElementById('streaming-indicator');
        if (streamingIndicator) {
          streamingIndicator.style.display = 'none';
        }
        
        // エラー状態を表示
        const stepElement = document.getElementById(\`step-\${stepIndex}\`);
        if (stepElement) {
          stepElement.classList.remove('streaming');
          stepElement.classList.add('error');
          
          // エラーメッセージを追加
          if (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'step-error';
            errorDiv.innerHTML = \`<strong>Error:</strong> \${escapeHtml(error)}\`;
            stepElement.appendChild(errorDiv);
          }
        }
      }

      function rerunStep(stepType, index) {
        vscode.postMessage({
          type: 'rerun',
          payload: { stepType, index }
        });
      }

      function getStepIcon(type, status) {
        if (status === 'running') return '<div class="spinner"></div>';
        if (status === 'error') return '❌';
        if (status === 'completed') return '✅';
        
        const icons = {
          generate: '📝',
          critique: '🔍',
          reflection: '💭',
          question: '❓',
          regenerate: '🔄',
          approval: '✓'
        };
        return icons[type] || '•';
      }

      function getStepTitle(type) {
        const titles = {
          generate: 'Generate',
          critique: 'Critique',
          reflection: 'Reflection',
          question: 'Question',
          regenerate: 'Regenerate',
          approval: 'Approval'
        };
        return titles[type] || type;
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
}
