# Product Overview

AI Writer for VS Code は、VS Code 上でアイデア入力から文章完成までの自律反復フローを提供する拡張機能を目指している。現状のリポジトリは、「autonomous-ai-writing-suite」仕様と VS Code AI 拡張性ドキュメントのライブラリを中心とした設計段階であり、本番コードはまだコミットされていない。

## Core Capabilities

- 生成→批判→考察→質問→再生成を強制する Iteration Engine を基軸とした反復ワークフローの仕様化（実装予定）。
- VS Code の AI 拡張 API を活用したチャット参加者／Language Model Tool 連携のリファレンスドキュメント集。
- `.kiro/specs/` を活用した要件→設計→タスク定義フローによる Spec Driven Development の運用基盤。

## Target Use Cases

- 文章制作チームが VS Code 内でアイデアからドラフト完成までを反復的に進めたいケース。
- VS Code 拡張開発者が AI エージェント連携や LM Tool API の適用パターンを検証したいケース。
- ドキュメント担当者が AI 拡張性関連のガイドを整備し、今後の実装メンバーへコンテキストを引き継ぎたいケース。

## Value Proposition

- 仕様・ドキュメント・ステアリングを一箇所で管理し、実装開始前からアーキテクチャ原則と反復フローを共有できる。
- VS Code AI API と複数プロバイダー連携に関する知識を再利用可能な形で蓄積し、開発開始時の立ち上がり時間を短縮する。
- Spec Driven Development による 3 フェーズ承認フローで将来の機能追加やテスト戦略をコントロールしやすくする。

---
_Focus on patterns and purpose, not exhaustive feature lists_
