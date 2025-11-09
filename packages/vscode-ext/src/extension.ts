import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext): void {
  // 初期アクティベーション時のリソース確保は後続タスクで実装する。
  void context;
}

export function deactivate(): void {
  // VS Code 拡張のクリーンアップ処理は今後の実装で追加する。
}
