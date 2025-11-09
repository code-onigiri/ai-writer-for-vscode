# VS Code AI Extension Patterns

## Role in Suite
- VS Code 拡張は Generation Orchestrator へのフロントエンドとして機能し、コマンド・Webview・Copilot Chat で反復ワークフローを操作する。
- Chat Participant と Language Model Tool API を組み合わせ、ユーザー入力 → Orchestrator 呼び出し → AI 応答の橋渡しを担う。
- AISDK Hub で統合されたモデル供給を利用し、エディタ側では UX・進行管理・資格情報入力に集中する。

## Activation Strategy
- `package.json` の `activationEvents` は最小化し、以下を組み合わせる:
  - `onCommand:ai-writer.startOutlineCycle` などユーザー操作トリガー。
  - `onChatParticipant:ai-writer.story-copilot` でチャット招集時のみ起動。
  - `onLanguageModelTool:ai-writer.iteration-status` でツール起動時に初期化。
- 起動後に `activate(context: vscode.ExtensionContext)` でコマンド登録・チャット参加者作成・LM Provider Bridge の初期化をまとめて行う。
- Deactivation ではリソース破棄のみ（ファイルウォッチャー等が増えた際に着手）。

```ts
export function activate(context: vscode.ExtensionContext) {
  const disposables = [
    vscode.commands.registerCommand('ai-writer.startOutlineCycle', handleOutlineStart),
    registerChatParticipant(context),
    registerLanguageModelTools(context),
  ];
  context.subscriptions.push(...disposables);
}
```

## Command & Context Menu Patterns
- コマンド名は `ai-writer.<feature>` 形式に統一し、`contributes.commands` + `menus` でエディタ/エクスプローラから起動可能にする。
- Command Handler では Base 層呼び出し前に以下を行う:
  1. 入力収集（QuickPick / InputBox / Webview）。
  2. `vscode.lm.selectChatModels` で既定モデルが利用可能か検証。
  3. 資格情報不足時は `showInformationMessage` + 設定コマンド誘導。
- 長時間実行は `withProgress` でユーザーへ進行を通知し、キャンセルを `CancellationTokenSource` 経由で連携。

## Chat Participant Integration
- `contributes.chatParticipants` で主要ペルソナを登録。`description` は入力欄プレースホルダーとして利用。
- `vscode.chat.createChatParticipant('ai-writer.story-copilot', handler)` で参加者生成。
- `ChatRequestHandler` の基本フロー:
  1. `context.history` から過去応答を抽出し、Iteration Engine の状態復元に利用。
  2. `request.model` の `sendRequest` でモデルを直接呼び出さず、AISDK Hub へ統一APIで委譲。
  3. ストリーミング結果は `stream.progress` → `stream.markdown` → `stream.button` の順で返す。
- Slash Command は `commands` 配列で定義し、`request.command` に応じて生成/批判/再生成などのモード切替を行う。
- Participant Detection (`disambiguation`) で「文章作成」「テンプレート適用」などカテゴリ別に例示し、自動ルーティングの精度を高める。

```ts
const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
  stream.progress('Iteration engine に照会しています…');
  const orchestrationResult = await orchestrator.handleChatTurn({ request, context, token });
  for await (const fragment of orchestrationResult.markdownStream) {
    stream.markdown(fragment);
  }
  return orchestrationResult.metadata;
};
```

## Language Model Tools
- `contributes.languageModelTools` に Iteration 状態取得やテンプレート適用チェックを登録。
- `vscode.lm.registerTool('ai-writer.iteration-status', toolImpl)` でツールを公開し、チャット参加者や他拡張から再利用可能にする。
- `prepareInvocation` で実行確認メッセージと進行テキストを返し、ユーザー側にどのセッションへ作用するか明示する。
- `invoke` 内では Orchestrator / Storage から最新セッションを読み取り、`LanguageModelToolResult` で Markdown / prompt-tsx を返却。

```ts
const iterationStatusTool: vscode.LanguageModelTool<IterationStatusInput> = {
  async prepareInvocation(options) {
    return {
      invocationMessage: `セッション ${options.input.sessionId} の状態を集計中…`,
    };
  },
  async invoke(options) {
    const summary = await orchestrator.summarize(options.input.sessionId);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(summary.markdown),
    ]);
  }
};
```

## Language Model Provider Bridge
- `vscode.lm.registerLanguageModelChatProvider` を利用し、AISDK Hub のモデルを VS Code UI に公開。
- `provideLanguageModelChatInformation` で Hub が管理するモデル一覧を `LanguageModelChatInformation` にマッピングし、ツール呼び出し可否（`capabilities.toolCalling`）を付与。
- `provideLanguageModelChatResponse` では受け取った `messages` を Base Orchestrator 用フォーマットへ変換し、Hub のストリームを `progress.report(new vscode.LanguageModelTextPart(...))` へ転送。
- `provideTokenCount` は Hub か基礎 SDK (Vercel AI SDK) の token counter を呼び出し、UI の残トークン計算を支援。

## Webview & Panels
- タイムライン表示やテンプレート編集は Webview Panel / Custom Editor で提供。
- `activationEvents` に `onWebviewPanel:ai-writer.progress` を追加し、復元時にも Orchestrator 状態と同期。
- Webview では `acquireVsCodeApi().postMessage` でユーザー操作を Extension Host へ通知し、Base 層更新後に `postMessage` で反映。
- Webview に埋め込むコードは `nonce`・`Content-Security-Policy` を設定し、外部リソース読み込みを制限。

## State & Secrets Management
- `context.globalState`/`workspaceState` は軽量フラグのみ。長期データは `.ai-writer/` へ保存（Storage Service 担当）。
- API キーや CLI パスは `vscode.authentication` と SecretStorage を使用し、CLI 実行が必要な `ai-sdk-provider-gemini-cli` 向け設定を保持。
- 設定変更コマンドは `vscode.commands.executeCommand('workbench.action.openSettings', 'ai-writer')` で UI を誘導。

## Telemetry & Feedback
- `vscode.env.createTelemetryLogger` でチャット評価 (`ChatParticipant.onDidReceiveFeedback`) とコマンド利用状況を記録。
- 拡張設定で Telemetry opt-in/out を尊重し、ログ送信前にフラグを確認。
- 重要イベント: `outlineCycle.started/completed`, `draftCycle.feedback`, `provider.failure` などを定義し、将来の KPI と照合。

## Testing & Packaging
- Extension テストは `@vscode/test-electron` で実行し、チャット／LM Tool／コマンドの E2E をカバー。
- Manifest (`package.json`) では `engines.vscode` を Language Model API 対応バージョン（1.95+）に固定。
- パブリッシュ前に `vsce package` で依存関係を検証し、`extensionDependencies` に必要な Copilot / LM Provider 拡張があれば列挙。

## Reference Snippets (Context7)
- Extension エントリポイント: `activate` 内でコマンド登録し、`context.subscriptions.push(disposable)` で後処理を委任。
- Chat Participant 登録: `package.json` の `contributes.chatParticipants` と `createChatParticipant` ハンドラ実装。
- Language Model Tool: `registerTool` + `LanguageModelToolResult` で Markdown/ツール結果を返却。
- Language Model Provider: `provideLanguageModelChatInformation` / `provideLanguageModelChatResponse` / `provideTokenCount` を実装し、モデルリストを VS Code UI に公開。
