# Technology Stack

## Architecture

- 三層構成（Base・VS Code Extension・LMTAPI Bridge）で責務を分離し、Base は純粋なサービス層として UI／VS Code 依存を持たない計画。
- 具体的な実装コードは未着手だが、`.kiro/specs/autonomous-ai-writing-suite/` に詳細なアーキテクチャ設計・契約が定義されている。
- 反復サイクルをステートマシンとして扱う Iteration Engine を中核に、Generation Orchestrator がテンプレート／ペルソナ／プロバイダ連携を統合する方針。

## Core Technologies

- **Language**: TypeScript（strict モード予定、現時点ではソース未作成）。
- **Framework**: VS Code Extension API（Language Model Chat Provider / Tool API 1.95+）、Vercel AI SDK を活用したプロバイダ統合。
- **Runtime**: Node.js 18 互換環境 + pnpm ワークスペース構成（`pnpm-workspace.yaml` 済だが `packages/` は未作成）。

## Key Libraries

- `ai`（Vercel AI SDK）と `@ai-sdk/openai` / `@ai-sdk/google` で OpenAI / Gemini API を抽象化する予定。
- Gemini CLI 連携は `ai-sdk-provider-gemini-cli` を利用し、CLI 呼び出しやストリーミング処理をライブラリへ委譲する計画。
- VS Code 標準の Language Model Tool API を利用し、拡張内のツール登録で反復ワークフローを公開する計画。

## Development Standards

### Type Safety
- TSConfig strict、`noImplicitAny` を前提とした型安全方針。Base レイヤー API は Result 型でエラーを表現する設計。

### Code Quality
- 共通 ESLint / Prettier 設定を pnpm ワークスペースで共有するタスクが未着手。導入後は Base・拡張・ブリッジで同一ルールを適用する。
- Git 連携と監査ログを前提とした開発フローを `.ai-writer/` ストレージ設計に組み込む。

### Testing
- Iteration Engine / Orchestrator / Template Registry / Persona Manager のユニットテストと VS Code 拡張の統合テストを設計済みだが実装は未開始。
- `package.json` の `test` スクリプトは `scripts/run-all-tests.js` を参照しているもののファイル未作成。テスト基盤着手前は実行不可。

## Development Environment

### Required Tools
- Node.js 18 LTS
- pnpm 8 以上（モノレポ管理）
- VS Code 1.95+（Language Model Tool API 利用のため）
- Gemini CLI（CLI チャネルを有効化する場合）

### Common Commands
```bash
# Install dependencies (ワークスペース整備後に有効)
pnpm install

# Run tests – run-all-tests.js が追加されるまで失敗する想定
pnpm test
```

## Key Technical Decisions

- AISDK Hub でプロバイダ登録・フェールオーバー・テンプレート適用を一元管理し、Base 層から `execute` / `stream` を呼び出す。
- Iteration Engine が状態遷移と規約違反検知を担い、VS Code 側は結果プレゼンテーションとユーザー入力に専念する。
- Gemini CLI 連携は `ai-sdk-provider-gemini-cli` を Hub に登録し、外部ライブラリが CLI 管理とエラーハンドリングを提供する構成に切り替える。
- ストレージはワークスペース内 `.ai-writer/` 配下に JSON / JSONL を保存し、Git 差分と監査ログの整合性を保つ。

---
_Document standards and patterns, not every dependency_
