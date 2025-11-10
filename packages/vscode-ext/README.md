# AI Writer VSCode Extension

VSCode拡張機能パッケージ - AI Writer自律型文章生成スイートのフロントエンド

## 現在の実装状況

### 実装済み機能 ✅

#### コア機能
- [x] 基本的な拡張機能構造
- [x] コマンド登録システム（CommandController）
- [x] Base層のGeneration Orchestratorとの連携
- [x] 出力チャネルでのログ表示
- [x] 設定サービスブリッジ（SecretStorageとの連携）

#### コマンド（全11個）

**生成コマンド（2個）**
- [x] `ai-writer.startOutline` - アウトライン生成開始
- [x] `ai-writer.startDraft` - ドラフト生成開始

**テンプレート管理（3個）**
- [x] `ai-writer.listTemplates` - テンプレート一覧表示
- [x] `ai-writer.createTemplate` - 新規テンプレート作成
- [x] `ai-writer.viewComplianceReport` - コンプライアンスレポート表示

**ペルソナ管理（3個）**
- [x] `ai-writer.listPersonas` - ペルソナ一覧表示
- [x] `ai-writer.createPersona` - 新規ペルソナ作成
- [x] `ai-writer.validateCompatibility` - 互換性検証

**統計・管理（3個）**
- [x] `ai-writer.viewStorageStats` - ストレージ統計表示
- [x] `ai-writer.viewAuditStats` - 監査ログ統計表示
- [x] `ai-writer.cleanupStorage` - 古いセッションのクリーンアップ

### 未実装機能

以下の機能は`.kiro/specs/autonomous-ai-writing-suite/tasks.md`の実装計画に従って、順次実装予定です：

- [ ] 進行状況表示Webview
- [ ] テンプレート・ペルソナ編集UI（高度な編集機能）
- [ ] 既存文章推敲UI
- [ ] プロバイダー切替UI
- [ ] Language Model Tool API連携
- [ ] リアルタイムBase層統合（現在はモックデータ使用）

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
├── commands/              # コマンド関連
│   ├── command-controller.ts  # コマンド登録と管理
│   ├── handlers/          # 生成コマンドハンドラー
│   ├── template-commands.ts   # テンプレート管理コマンド ✨NEW
│   ├── persona-commands.ts    # ペルソナ管理コマンド ✨NEW
│   ├── statistics-commands.ts # 統計・管理コマンド ✨NEW
│   ├── index.ts
│   └── types.ts          # 型定義
├── configuration/        # 設定管理
│   └── config-bridge.ts  # VSCode SecretStorageとBase層の橋渡し
├── extension.ts          # エントリポイント（11コマンド登録）
└── index.ts             # エクスポート
```

## 使い方

### コマンドの実行

1. **コマンドパレットを開く**: `Cmd/Ctrl+Shift+P`
2. **"AI Writer"と入力**: すべてのコマンドが表示されます
3. **コマンドを選択**: 実行したいコマンドを選択
4. **プロンプトに従う**: 対話的に入力を進めます

### 使用例

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
