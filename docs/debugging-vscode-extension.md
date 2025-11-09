# VSCode拡張機能のデバッグ方法

このドキュメントでは、AI Writer VSCode拡張機能をVSCode上でデバッグおよび表示する方法を説明します。

## 前提条件

- Node.js 18.20.0以上がインストールされていること
- pnpmがインストールされていること（`npm install -g pnpm`）
- Visual Studio Codeがインストールされていること

## セットアップ手順

### 1. 依存関係のインストール

プロジェクトルートで以下のコマンドを実行します：

```bash
pnpm install
```

### 2. ビルドの実行

VSCode拡張機能をビルドする前に、依存するbaseパッケージを先にビルドする必要があります：

```bash
# すべてのパッケージをビルド
pnpm build

# または、vscode-extとその依存関係を一括ビルド（推奨）
pnpm run build:vscode

# baseパッケージのみをビルド
pnpm run build:base
```

### 3. デバッグの開始

VSCodeでプロジェクトを開いている状態で、以下の手順でデバッグを開始できます：

#### 方法1: F5キーを使用

1. VSCodeでプロジェクトルートを開く
2. F5キーを押す
3. 新しいVSCodeウィンドウ（Extension Development Host）が開く

#### 方法2: デバッグパネルから開始

1. VSCodeの左側のアクティビティバーで「実行とデバッグ」アイコンをクリック
2. 「Run Extension」を選択
3. 緑色の再生ボタンをクリック

### 4. 拡張機能の動作確認

デバッグウィンドウが開いたら、以下の手順で拡張機能の動作を確認できます：

1. コマンドパレットを開く（Cmd+Shift+P または Ctrl+Shift+P）
2. 以下のコマンドを検索して実行：
   - `AI Writer: Start Outline Generation` - アウトライン生成を開始
   - `AI Writer: Start Draft Generation` - ドラフト生成を開始

### 5. ログの確認

拡張機能のログは以下の場所で確認できます：

1. 「出力」パネルを開く（表示 > 出力）
2. ドロップダウンから「AI Writer」を選択
3. 拡張機能のアクティベーションメッセージやエラーログが表示される

## デバッグ設定の詳細

### launch.json

プロジェクトには `.vscode/launch.json` が設定されており、以下の内容が含まれています：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/packages/vscode-ext"
      ],
      "outFiles": [
        "${workspaceFolder}/packages/vscode-ext/dist/**/*.js"
      ],
      "preLaunchTask": "build vscode extension"
    }
  ]
}
```

### tasks.json

ビルドタスクは `.vscode/tasks.json` に定義されており、デバッグ開始時に自動的に実行されます：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build vscode extension",
      "type": "shell",
      "command": "pnpm",
      "args": [
        "--filter",
        "@ai-writer/vscode-ext",
        "build"
      ],
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": [
        "$tsc"
      ]
    }
  ]
}
```

## トラブルシューティング

### ビルドエラー: "Cannot find module '@ai-writer/base/config'"

このエラーが発生した場合は、baseパッケージが正しくビルドされていません。以下を実行してください：

```bash
pnpm --filter @ai-writer/base build
pnpm --filter @ai-writer/vscode-ext build
```

### 拡張機能が表示されない

1. Extension Development Hostウィンドウで拡張機能が正しくアクティベートされているか確認
2. 「出力」パネルの「AI Writer」チャネルでエラーメッセージを確認
3. baseパッケージのorchestratorが正しく読み込まれているか確認

### コマンドが実行できない

拡張機能のアクティベーションイベントが正しく設定されているか確認してください。`package.json`の`activationEvents`セクションを確認：

```json
"activationEvents": [
  "onCommand:ai-writer.startOutline",
  "onCommand:ai-writer.startDraft"
]
```

## 開発ワークフロー

### コードの変更とリロード

1. ソースコードを変更
2. Extension Development Hostウィンドウでリロード（Cmd+R または Ctrl+R）
   - またはコマンドパレットから「Developer: Reload Window」を実行
3. 変更が反映される

### ブレークポイントの設定

1. VSCodeでソースコード（`.ts`ファイル）を開く
2. 行番号の左側をクリックしてブレークポイントを設定
3. デバッグ実行時にブレークポイントで停止
4. 変数の値やコールスタックを確認できる

### 自動リビルド

ファイル変更時に自動的にリビルドする場合は、別のターミナルで以下を実行：

```bash
# watchモードでビルド
pnpm run build:watch

# または直接実行
pnpm --filter @ai-writer/vscode-ext build --watch
```

## 参考リンク

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Development](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Debugging Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
