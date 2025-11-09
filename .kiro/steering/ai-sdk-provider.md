# AI SDK Provider Development

## Purpose
- Vercel AI SDK の ProviderV3 仕様に沿って独自またはコミュニティ製プロバイダーを統合する際の基準をまとめる。
- `ai-sdk-provider-gemini-cli` を含む外部プロバイダーを安全に取り込む前提条件と、将来的な自作プロバイダーの実装方針を共有する。

## Dependency Baseline
- プロバイダー開発・拡張に必須: `@ai-sdk/provider`, `@ai-sdk/provider-utils`。
- OpenAI 互換エンドポイントを扱う場合: `@ai-sdk/openai-compatible` で Chat/Completion/Embedding/Image 各モデルを生成。
- 既存プロバイダーのカスタム版を導入する場合は `createXxx` ファクトリ（例: `createOpenAI`, `createAnthropic`, `createVoyage`）。
- CLI ベースの Gemini 連携は `ai-sdk-provider-gemini-cli` を採用し、CLI 呼び出し・ストリーミング管理をライブラリ側へ委譲する。

## Provider Factory Pattern
1. `createXxx(options)` で API キー・Base URL・Headers を受け取るファクトリを定義する。
2. `loadApiKey` や `withoutTrailingSlash` など `provider-utils` を使い、環境変数由来の設定を一元化。
3. 戻り値は「モデル ID を受け取り LanguageModelV3 を返す関数」とし、`provider.languageModel` など型別アクセサを拡張する。
4. new キーワード禁止など利用者側の誤用を防ぐガードを含める。

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { loadApiKey } from '@ai-sdk/provider-utils';

export const example = createOpenAICompatible({
  name: 'example',
  apiKey: loadApiKey({
    environmentVariableName: 'EXAMPLE_API_KEY',
    description: 'Example API key',
  }),
  baseURL: 'https://api.example.com/v1',
});
```

## Model Support Strategy
- OpenAI 互換 API なら `OpenAICompatibleChatLanguageModel` など既存クラスを再利用し、多種類のモデルを provider 関数にぶら下げる。
- 完全独自実装は `LanguageModelV3` を継承したクラスを定義し、`doGenerate` / `doStream` の内部で API 呼び出し・レスポンス変換を担う。
- ツール呼び出しやマルチモーダル対応が必要な場合は `LanguageModelV3ProviderClientDefinedTool` を使ってネイティブ機能を露出する。

## Registry Integration
- `createProviderRegistry` でプロバイダーグループを名前空間付きで統合し、`languageModel('anthropic > reasoning')` のように解決する。
- `customProvider` を併用するとモデル別のエイリアス、フォールバック（例: `fallbackProvider: anthropic`）を設定できる。
- 区切り文字は `{ separator: ' > ' }` などで変更可能。プロジェクト内の命名規則に合わせる。
- グローバル既定プロバイダーを設定する場合は `globalThis.AI_SDK_DEFAULT_PROVIDER = openai;` を初期化時に一度だけ実行する。

## Configuration Patterns
- API キーや CLI パスは `.env` から読み込むが、`loadApiKey` を用いて不足時の説明メッセージを提供する。
- `providerOptions` を使うと呼び出し側からプロバイダー固有の追加パラメータ（例: `{'provider-name': { customOption: 'value' }}`）を渡せる。
- CLI プロバイダー導入時は CLI バージョン互換性とモデル名マッピングを registry 層で管理する。

## Package Layout & Build
- 推奨構成: `packages/<name>/src/` 配下にモデル設定ファイル・メイン実装・テストを分割し、`tsup` などでビルド。
- `package.json` には `@ai-sdk/provider`, `@ai-sdk/provider-utils`, 必要に応じて `@ai-sdk/openai-compatible` を依存として宣言する。
- 公開 API は `src/index.ts` 経由で集約し、型定義を含めてエクスポートする。

## Validation & Testing
- 単体テストで `provider('model-id')` → `generateText` の呼び出しを実際に行い、レスポンスの token usage や tool call 変換を検証する。
- ストリーミング対応モデルは `doStream` の戻り値を TextDecoderStream でデコードし、chunk 解析が期待通りか確認する。
- CLI ベースのプロバイダー導入時は CLI 不在環境の例外処理やリトライ戦略をライブラリが提供するか確認する。

## Usage Pattern
```ts
import { generateText } from 'ai';
import { geminiCli } from 'ai-sdk-provider-gemini-cli';

const { text } = await generateText({
  model: geminiCli('gemini-1.5-flash'),
  prompt: '反復ライティングワークフローの概要を説明して',
});
```
- Project 内では AISDK Hub 経由で `registry.languageModel('gemini-cli > gemini-1.5-flash')` のように呼び出す想定。

## Observability & Error Handling
- `LanguageModelV3` 実装では `warnings`・`usage` を返却し、呼び出し側でトークン使用量・注意事項を表示できるようにする。
- レスポンス解析で失敗した場合は `provider_failure` など上位層の Result 型に対応したエラーコードを返す。
- `providerOptions` 経由で渡された未対応フィールドはバリデーションして警告を追加する。

## References
- Vercel AI SDK Docs: Provider Management / Custom Providers / Provider Registry。
- コミュニティプロバイダー実装例: `@requesty/ai-sdk`, `ai-sdk-provider-gemini-cli`, `voyage-ai-provider`。
- 公式 ProviderV3 実装（`@ai-sdk/openai`, `@ai-sdk/anthropic`）を設計のベースラインとする。
