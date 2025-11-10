# AI Writer for VSCode - 使用ガイド

## 目次
1. [はじめに](#はじめに)
2. [インストール](#インストール)
3. [基本的な使い方](#基本的な使い方)
4. [テンプレート管理](#テンプレート管理)
5. [ペルソナ管理](#ペルソナ管理)
6. [プロバイダー設定](#プロバイダー設定)
7. [文章推敲](#文章推敲)
8. [Language Model統合](#language-model統合)
9. [トラブルシューティング](#トラブルシューティング)

## はじめに

AI Writer for VSCodeは、AIを活用した包括的なライティング環境を提供するVSCode拡張機能です。

### 主な機能
- **生成ワークフロー可視化**: AIによる文章生成プロセスをリアルタイムで追跡
- **テンプレート管理**: 再利用可能なテンプレートの作成・編集
- **ペルソナ管理**: 文章のトーンやスタイルをカスタマイズ
- **プロバイダー設定**: 複数のAIプロバイダーから選択
- **文章推敲**: 既存文章の改善提案
- **Language Model統合**: VSCode組み込みAIとのシームレスな連携

## インストール

### 前提条件
- Visual Studio Code 1.80以降
- Node.js 18以降（開発時のみ）

### インストール手順

1. VSCode拡張機能マーケットプレイスから「AI Writer」を検索
2. 「インストール」をクリック
3. VSCodeを再起動

または、VSIXファイルからインストール：
```bash
code --install-extension ai-writer-*.vsix
```

## 基本的な使い方

### アウトライン生成

1. コマンドパレットを開く（`Cmd/Ctrl+Shift+P`）
2. 「AI Writer: Start Outline Generation」を実行
3. 進行状況パネルが表示され、生成プロセスが可視化されます

```typescript
// 自動的に以下のステップが実行されます：
// 1. 生成 (Generate)
// 2. 批判 (Critique)
// 3. 考察 (Reflection)
// 4. 質問 (Question)
// 5. 再生成 (Regenerate)
```

### ドラフト生成

1. コマンドパレットを開く
2. 「AI Writer: Start Draft Generation」を実行
3. アウトラインに基づいてドラフトが生成されます

### セッション管理

左側のサイドバーに「AI Writer」ビューが表示されます：
- **Sessions**: 過去の生成セッションを確認
- **Templates**: テンプレート一覧を表示

## テンプレート管理

### テンプレートの作成

1. コマンドパレットから「AI Writer: Create Template」を実行
2. テンプレートエディタが開きます
3. 以下の情報を入力：
   - **テンプレート名**: わかりやすい名前
   - **ペルソナヒント**: カンマ区切りで複数指定可能
   - **ポイント**: 各セクションの指示を定義

#### ポイントの管理

各ポイントには以下を設定：
- **タイトル**: セクションの名前
- **指示**: AIへの具体的な指示内容
- **優先度**: 数値で重要度を指定

```
例：
ポイント1:
  タイトル: Introduction
  指示: Write an engaging introduction that hooks the reader
  優先度: 10

ポイント2:
  タイトル: Main Content
  指示: Provide detailed information with examples
  優先度: 20
```

### テンプレートの編集

1. コマンドパレットから「AI Writer: Edit Template」を実行
2. 編集したいテンプレートを選択
3. テンプレートエディタで変更
4. 「Save Template」で保存

### テンプレート一覧の表示

1. コマンドパレットから「AI Writer: List Templates」を実行
2. または、サイドバーの「Templates」ビューを確認

## ペルソナ管理

### ペルソナの作成

1. コマンドパレットから「AI Writer: Create Persona」を実行
2. ペルソナエディタが開きます
3. 以下の情報を入力：

#### 基本情報
- **ペルソナ名**: 識別しやすい名前
- **トーン**: professional, casual, academic, technical, friendly, formal
- **対象オーディエンス**: developers, general, experts, beginners, business, students

#### トグル機能

ペルソナに特定の機能をON/OFFで追加：
```
例：
- include_examples: true
- technical_depth: true
- use_citations: false
```

1. 「Add Toggle」をクリック
2. トグル名を入力（例: `include_examples`）
3. チェックボックスでON/OFF切り替え

### ペルソナの編集

1. コマンドパレットから「AI Writer: Edit Persona」を実行
2. 編集したいペルソナを選択
3. ペルソナエディタで変更
4. 「Save Persona」で保存

### ペルソナ一覧の表示

1. コマンドパレットから「AI Writer: List Personas」を実行

## プロバイダー設定

### プロバイダーの設定

1. コマンドパレットから「AI Writer: Configure AI Providers」を実行
2. プロバイダー設定パネルが開きます

### 対応プロバイダー

#### 1. OpenAI
- **API Key**: OpenAIのAPIキー（必須）
- **Model**: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- **Endpoint**: カスタムエンドポイント（オプション）

```
設定例：
✓ Enabled
API Key: sk-...
Model: gpt-4
Endpoint: https://api.openai.com/v1 (デフォルト)
```

#### 2. Gemini API
- **API Key**: GoogleのAPIキー（必須）
- **Model**: gemini-pro, gemini-pro-vision

```
設定例：
✓ Enabled
API Key: AIza...
Model: gemini-pro
```

#### 3. Gemini CLI
- **CLI Path**: Gemini CLI実行ファイルのパス（必須）
- **Model**: モデル名

```
設定例：
✓ Enabled
CLI Path: /usr/local/bin/gemini
Model: gemini-pro
```

#### 4. VS Code Language Model
- 設定不要
- VSCodeに組み込まれているAI機能を使用

```
設定例：
✓ Enabled
（追加設定なし）
```

### 検証とテスト

各プロバイダーには以下のボタンがあります：
- **Validate**: 設定の検証
- **Test Connection**: 接続テスト

設定を保存する前に必ず検証を実行してください。

## 文章推敲

### 現在のドキュメントを推敲

1. 推敲したいファイルを開く
2. コマンドパレットから「AI Writer: Revise Current Document」を実行
3. 文章推敲パネルが表示されます

### 改善提案の確認

推敲パネルには以下が表示されます：
- **セクション**: 該当箇所の識別
- **オリジナル**: 現在のテキスト
- **提案**: 改善されたテキスト
- **理由**: 改善の理由

### 提案の処理

各提案に対して以下の操作が可能：

#### 個別の提案
- **Accept**: 提案を承認してドキュメントに適用
- **Reject**: 提案を拒否
- **Highlight**: ドキュメント内の該当箇所にジャンプ

#### 一括操作
- **Accept All**: すべての保留中の提案を承認
- **Reject All**: すべての保留中の提案を拒否
- **Regenerate Suggestions**: 提案を再生成

### ステータスサマリー

パネル下部にステータスが表示されます：
```
3 pending • 2 accepted • 1 rejected
```

## Language Model統合

### Language Model APIの使用

VSCodeのLanguage Model APIを使用してコンテンツを生成：

```typescript
import { LanguageModelChatProvider } from './integrations/language-model-bridge';

// プロバイダーの初期化
const provider = new LanguageModelChatProvider();
await provider.initialize();

// シンプルな生成
const response = await provider.generate('Write an introduction', {
  systemPrompt: 'You are a professional writer',
  justification: 'AI Writer content generation'
});

// ストリーミング生成
for await (const chunk of provider.generateStreaming('Write content...')) {
  console.log(chunk);
}

// 会話履歴を使った生成
const response = await provider.generateWithHistory([
  { role: 'user', content: 'What is AI?' },
  { role: 'assistant', content: 'AI stands for...' },
  { role: 'user', content: 'Tell me more' }
]);
```

### 登録済みツール

以下のツールがLanguage Modelから呼び出し可能：

#### 1. aiWriter_checkTemplateCompliance
テンプレート準拠をチェック

```typescript
{
  templateId: 'template-123',
  content: '生成されたコンテンツ'
}
```

#### 2. aiWriter_getTemplate
テンプレート情報を取得

```typescript
{
  templateId: 'template-123'
}
```

#### 3. aiWriter_getPersona
ペルソナ情報を取得

```typescript
{
  personaId: 'persona-123'
}
```

## トラブルシューティング

### Language Model APIが利用できない

**症状**: 「Language Model API is not available」と表示される

**解決策**:
1. VSCodeのバージョンを確認（1.80以降が必要）
2. VSCodeを最新版に更新
3. 拡張機能を再インストール

### テンプレートが保存できない

**症状**: 「Failed to save template」エラー

**解決策**:
1. テンプレート名が入力されているか確認
2. 少なくとも1つのポイントが存在するか確認
3. Output Channelでエラー詳細を確認

### プロバイダー接続エラー

**症状**: 「Connection test failed」

**解決策**:
1. APIキーが正しいか確認
2. ネットワーク接続を確認
3. プロバイダーのサービスステータスを確認
4. プロキシ設定が必要な場合はVSCodeの設定を確認

### 文章推敲で提案が表示されない

**症状**: 「No suggestions available」

**解決策**:
1. ドキュメントに十分なテキストがあるか確認
2. 「Regenerate Suggestions」をクリック
3. 別のプロバイダーを試す

### Output Channelでログを確認

問題が解決しない場合：
1. View → Output を開く
2. ドロップダウンから「AI Writer」を選択
3. エラーメッセージを確認

## ベストプラクティス

### テンプレート作成のヒント

1. **明確な指示**: 各ポイントに具体的で明確な指示を記述
2. **適切な粒度**: セクションを細かく分けすぎない
3. **優先度の設定**: 重要なセクションに高い優先度を設定
4. **ペルソナヒント**: テンプレートに適したペルソナヒントを追加

### ペルソナ設定のヒント

1. **目的の明確化**: ペルソナの使用目的を明確に
2. **対象オーディエンス**: 読者層に合わせたトーン選択
3. **トグルの活用**: 必要な機能のみを有効化
4. **テスト**: 作成したペルソナで実際に生成してテスト

### プロバイダー選択のヒント

1. **用途別選択**: タスクに応じて最適なプロバイダーを選択
2. **コスト管理**: APIの使用量とコストを監視
3. **バックアップ**: 複数のプロバイダーを設定
4. **Language Model優先**: 可能な限りVSCode組み込みAIを使用

## サポート

- GitHub Issues: https://github.com/code-onigiri/ai-writer-for-vscode/issues
- ドキュメント: `/docs` フォルダ
- 仕様書: `.kiro/specs/autonomous-ai-writing-suite/`

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
