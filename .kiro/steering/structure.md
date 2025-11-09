# Project Structure

## Organization Philosophy

- Spec Driven Development を前提に `.kiro/specs/` で要件→設計→タスクを確定し、ステアリングで長期的な原則を保持する。
- 今後は pnpm ワークスペース上に Base・VS Code 拡張・LMT Bridge の 3 パッケージを配置し、レイヤー間依存を明示的な契約に限定する計画。
- 現状はドキュメントと仕様が中心のプレプロダクション段階であり、将来の実装が既存ガードレールを崩さないよう構造を先に定義している。

## Directory Patterns

### Steering Memory
**Location**: `.kiro/steering/`
**Purpose**: プロジェクト横断の原則とパターンを保持する常設メモリ。
**Example**: `.kiro/steering/tech.md`（技術スタックの指針）。

### Feature Specifications
**Location**: `.kiro/specs/`
**Purpose**: アクティブな仕様（要件・設計・タスク）を段階的に管理する。
**Example**: `.kiro/specs/autonomous-ai-writing-suite/design.md`（反復ワークフローの詳細設計）。

### Documentation Library
**Location**: `docs/`
**Purpose**: VS Code AI 拡張性関連の一次ドキュメントを収集し、`# DO NOT TOUCH` 規約付きで保守する。
**Example**: `docs/chat.md`（Chat Participant ガイド）。

### Prompt & Agent Configuration
**Location**: `.github/prompts/`
**Purpose**: Kiro Steering やエージェントプロンプトを管理し、自動化ワークフローへ供給する。
**Example**: `.github/prompts/kiro-steering.prompt.md`。

### Root Guidance
**Location**: `AGENTS.md`, `GEMINI.md`
**Purpose**: ワークスペース内で稼働するエージェント向けの行動規範とメモを提供する。
**Example**: `AGENTS.md`（英語思考・日本語応答の指示）。

## Naming Conventions

- **Files**: 予定されている TypeScript パッケージは `kebab-case` ディレクトリ＋`camelCase.ts` ファイルを基本とし、ドキュメントは元のトピック名に合わせた `kebab-case.md` を維持する。
- **Components / Classes**: `PascalCase`（例: `IterationEngine`）。
- **Functions / Variables**: `camelCase`。Result 型などの discriminated union には `kind` プロパティを用いる。

## Import Organization

```typescript
// Base 層の契約を別パッケージとして公開する想定
import { startOutlineCycle } from '@base/orchestrator';
import type { OutlineInput } from '@base/contracts';

// VS Code 拡張側ではローカル UI コンポーネントのみ相対インポート
import { OutlinePanel } from './panels/OutlinePanel';
```

**Path Aliases**:
- `@base/`: `packages/base/src`（予定）
- `@extension/`: `packages/vscode-ext/src`（予定）
- `@lmt/`: `packages/lmtapi-vscode/src`（予定）

## Code Organization Principles

- Base パッケージは VS Code API を参照せず、使う側へ Result 型インターフェースを提供する。
- VS Code 拡張 (`packages/vscode-ext`) はコマンド登録と UI に集中し、生成ロジックは Orchestrator へ委譲する。
- LMT Bridge は VS Code Language Model Tool API のみと接続し、Hub/Orchestrator との境界を明確に保つ。
- `docs/` 配下は翻訳・編集ワークフローに依存するため、直接編集は避け、更新時は元ソースとの同期手順を踏む。
- `.kiro/` 配下のステアリング・仕様は人手承認フローで更新し、実装ブランチは常に最新ステアリングを参照する。

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
