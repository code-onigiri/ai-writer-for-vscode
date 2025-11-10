# AI Writer VSCode Extension

VSCode拡張機能パッケージ - AI Writer自律型文章生成スイートのフロントエンド

## 📚 ドキュメント

- **[使用ガイド](../../docs/usage-guide.md)** - 機能の詳細な使い方
- **[APIリファレンス](../../docs/api-reference.md)** - 開発者向けAPI仕様
- **[ビジュアルガイド](../../docs/gui-features-visual-guide.md)** - UI機能の図解
- **[デバッグガイド](../../docs/debugging-vscode-extension.md)** - デバッグ方法

## 現在の実装状況

### 実装済み機能 ✅

#### コア機能
- [x] 基本的な拡張機能構造
- [x] コマンド登録システム（CommandController）
- [x] Base層のGeneration Orchestratorとの連携
- [x] 出力チャネルでのログ表示
- [x] 設定サービスブリッジ（SecretStorageとの連携）

#### UI機能 ✨
- [x] **進行状況表示Webview** (Task 5.2) - 生成サイクルをリアルタイムで可視化
  - タイムライン形式のステップ表示
  - ストリーミングコンテンツ表示
  - ステップごとの状態管理（pending/running/completed/error）
- [x] **セッション一覧TreeView** - 過去のセッションをブラウズ
- [x] **テンプレート管理TreeView** - テンプレート一覧と詳細表示
- [x] **テンプレート詳細Webview** - ポイントごとの指示を確認
- [x] **テンプレートエディタパネル** (Task 5.3) - テンプレートの作成・編集
  - ポイントの動的追加・削除
  - 優先度とペルソナヒントの設定
  - リアルタイム検証
- [x] **ペルソナエディタパネル** (Task 5.3) - ペルソナの作成・編集
  - トーンと対象オーディエンス選択
  - トグル機能の管理
  - ソース情報の記録
- [x] **プロバイダー設定パネル** (Task 5.4) - AIプロバイダーの設定
  - OpenAI、Gemini API、Gemini CLI、VS Code Language Model対応
  - APIキー管理（Secret Storage）
  - コネクションテスト機能
- [x] **文章推敲パネル** (Task 5.4) - 既存文章の改善
  - AI生成の改善提案
  - 並列比較表示
  - 承認/拒否機能
- [x] **ステータスバー統合** - 現在のセッション状態を表示
- [x] **SessionManager** - セッション状態の追跡と管理

#### Language Model統合 🤖
- [x] **LanguageModelBridge** (Task 6.1) - VSCode Language Model APIブリッジ
  - モデル選択と管理
  - ストリーミングリクエスト
  - トークンカウント
- [x] **LanguageModelChatProvider** (Task 6.1) - チャット機能プロバイダー
  - シンプルな生成API
  - 会話履歴管理
- [x] **Language Model Tools** (Task 6.2) - 登録済みツール
  - `aiWriter_checkTemplateCompliance` - テンプレート準拠チェック
  - `aiWriter_getTemplate` - テンプレート情報取得
  - `aiWriter_getPersona` - ペルソナ情報取得
- [x] **ToolManager** (Task 6.3) - ツールのライフサイクル管理

#### コマンド（全15個）

**生成コマンド（2個）**
- [x] `ai-writer.startOutline` - アウトライン生成開始
- [x] `ai-writer.startDraft` - ドラフト生成開始

**テンプレート管理（4個）**
- [x] `ai-writer.listTemplates` - テンプレート一覧表示
- [x] `ai-writer.createTemplate` - 新規テンプレート作成
- [x] `ai-writer.editTemplate` - テンプレート編集
- [x] `ai-writer.viewComplianceReport` - コンプライアンスレポート表示

**ペルソナ管理（4個）**
- [x] `ai-writer.listPersonas` - ペルソナ一覧表示
- [x] `ai-writer.createPersona` - 新規ペルソナ作成
- [x] `ai-writer.editPersona` - ペルソナ編集
- [x] `ai-writer.validateCompatibility` - 互換性検証

**プロバイダー・推敲（2個）**
- [x] `ai-writer.configureProviders` - プロバイダー設定
- [x] `ai-writer.reviseDocument` - 文章推敲

**統計・管理（3個）**
- [x] `ai-writer.viewStorageStats` - ストレージ統計表示
- [x] `ai-writer.viewAuditStats` - 監査ログ統計表示
- [x] `ai-writer.cleanupStorage` - 古いセッションのクリーンアップ

### 完了したタスク

- ✅ Task 5.1: コマンドコントローラ
- ✅ Task 5.2: 進行状況Webviewとサイクル操作UI
- ✅ Task 5.3: テンプレート・ペルソナ編集ビュー
- ✅ Task 5.4: 既存文章推敲とプロバイダー切替UI
- ✅ Task 6.1: LanguageModelChatProviderブリッジ
- ✅ Task 6.2: Language Model Tool登録
- ✅ Task 6.3: ツール呼び出しと遵守レポート連携

### 制限事項

以下は今後の改善予定：

- ストリーミング表示は現在シミュレーション（`setTimeout`使用）
- Orchestratorからの実際のイベント統合が必要
- Rerunボタンは表示のみ（インタラクションハンドラー未実装）
- 文章推敲の提案は現在モックデータ
- Language Modelツールのデータ統合が必要

## ビルド方法

```bash
# プロジェクトルートから
pnpm --filter @ai-writer/vscode-ext build

# または watch モード
pnpm --filter @ai-writer/vscode-ext build --watch
```

## デバッグ方法

詳細は[デバッグガイド](../../docs/debugging-vscode-extension.md)を参照してください。

簡単な手順：

1. VSCodeでプロジェクトルートを開く
2. F5キーを押す
3. Extension Development Hostウィンドウが開く
4. コマンドパレットから`AI Writer:`で始まるコマンドを実行

## プロジェクト構造

```
src/
├── commands/                      # コマンド関連
│   ├── command-controller.ts      # コマンド登録と管理
│   ├── handlers/                  # 生成コマンドハンドラー
│   │   ├── start-outline.ts       # アウトライン生成
│   │   └── start-draft.ts         # ドラフト生成
│   ├── template-commands.ts       # テンプレート管理コマンド
│   ├── persona-commands.ts        # ペルソナ管理コマンド
│   ├── revision-commands.ts       # プロバイダー・推敲コマンド
│   ├── statistics-commands.ts     # 統計・管理コマンド
│   ├── index.ts
│   └── types.ts                   # 型定義
├── configuration/                 # 設定管理
│   └── config-bridge.ts           # VSCode SecretStorageとBase層の橋渡し
├── services/                      # サービス層
│   └── session-manager.ts         # セッション追跡と管理
├── views/                         # UIコンポーネント
│   ├── progress-panel-provider.ts      # 進行状況Webview
│   ├── session-tree-provider.ts        # セッション一覧TreeView
│   ├── template-tree-provider.ts       # テンプレート一覧TreeView
│   ├── template-detail-view-provider.ts # テンプレート詳細Webview
│   ├── template-editor-panel.ts        # テンプレートエディタ (Task 5.3)
│   ├── persona-editor-panel.ts         # ペルソナエディタ (Task 5.3)
│   ├── provider-settings-panel.ts      # プロバイダー設定 (Task 5.4)
│   └── document-revision-panel.ts      # 文章推敲 (Task 5.4)
├── integrations/                  # 外部統合 (Task 6)
│   ├── language-model-bridge.ts   # Language Model APIブリッジ
│   └── language-model-tools.ts    # Language Modelツール
├── extension.ts                   # エントリポイント（コマンドとビュー登録）
└── index.ts             # エクスポート
```

## 使い方

### コマンドの実行

1. **コマンドパレットを開く**: `Cmd/Ctrl+Shift+P`
2. **"AI Writer"と入力**: すべてのコマンドが表示されます
3. **コマンドを選択**: 実行したいコマンドを選択
4. **プロンプトに従う**: 対話的に入力を進めます

### 使用例

#### アウトライン生成（進行状況表示付き）✨NEW
```
1. Cmd/Ctrl+Shift+P
2. "AI Writer: Start Outline Generation"
3. アイデアを入力（例：「AIと教育についての記事」）
4. 進行状況Webviewが自動的に表示される
5. 生成→批判のステップをリアルタイムで確認
```

#### セッション一覧の確認 ✨NEW
```
1. サイドバーの "AI Writer" アイコンをクリック
2. "Sessions" ビューで過去のセッションを確認
3. セッションをクリックしてプレビューを表示
```

#### テンプレート管理 ✨NEW
```
1. サイドバーの "AI Writer" アイコンをクリック
2. "Templates" ビューでテンプレート一覧を表示
3. テンプレートをクリックして詳細を確認
4. "Template Details" ビューでポイントごとの指示を確認
```

#### テンプレート作成
```
1. Cmd/Ctrl+Shift+P
2. "AI Writer: Create Template"
3. テンプレート名を入力
4. 完成！
```

#### ペルソナ作成
```
1. Cmd/Ctrl+Shift+P
2. "AI Writer: Create Persona"
3. 名前、トーン、オーディエンスを選択
4. 完成！
```

#### 統計確認
```
1. Cmd/Ctrl+Shift+P
2. "AI Writer: View Storage Statistics"
3. セッション数、ストレージサイズを確認
```

## 依存関係

- `@ai-writer/base` - コア機能（Orchestrator、Template Registry等）
- `vscode` - VSCode拡張機能API

## 今後の開発予定

仕様書（`.kiro/specs/autonomous-ai-writing-suite/`）に基づき、以下の順序で実装を進めます：

1. **Phase 2.2-2.4**: Base層の残りのコンポーネント
   - Generation Orchestratorのセッション管理完全実装
   - Template Registry
   - Persona Manager

2. **Phase 3**: AISDK Hubとプロバイダー連携
   - OpenAI、Gemini API、Gemini CLIチャネル
   - LMTブリッジ

3. **Phase 4**: ストレージとバージョン管理

4. **Phase 5**: VSCode拡張UI（本パッケージ）
   - コマンドコントローラーの拡張
   - Webviewによる進行状況表示
   - テンプレート・ペルソナ編集UI
   - 既存文章推敲UI

5. **Phase 6**: Language Model Tool API連携

6. **Phase 7**: 品質保証と運用準備

## 貢献

開発に参加する場合は、[CONTRIBUTING.md](../../CONTRIBUTING.md)を参照してください。
