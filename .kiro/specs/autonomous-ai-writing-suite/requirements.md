# Requirements Document

## Introduction
AI Writerは、アイデア入力からアウトライン生成、アウトラインから文章生成までを反復サイクルで支援し、さまざまな文章形式への適応とバージョン管理・個別パーソナライゼーションを一元化する自律型文章生成スイートです。

## Requirements

### Requirement 1: アイデアからアウトライン生成
**Objective:** As a コンテンツプランナー, I want 初期アイデアから多層アウトラインを自動生成したい, so that 文章制作の準備を迅速に行える

#### Acceptance Criteria
1. When ユーザーがアイデア入力を送信したとき, the Autonomous AI Writing Suite shall 受信したアイデアを解析し、少なくとも3つの主要セクションと関連小項目を含むアウトライン候補を生成する。
2. When ユーザーがアウトライン生成直後に批判フェーズを開始したとき, the Autonomous AI Writing Suite shall 提案アウトラインの不足点・偏り・追加候補を列挙する。
3. While アウトライン改善サイクルがアクティブな間, the Autonomous AI Writing Suite shall 生成→批判→考察→質問→再生成の順序で各ステップを提示し、ユーザーが完了を確認するまでは次ステップへ遷移させない。
4. If 入力アイデアが抽象的過ぎると分類された場合, then the Autonomous AI Writing Suite shall 質問ステップで具体化のための追加入力を要求する。
5. The Autonomous AI Writing Suite shall 直近5世代分のアウトライン案を履歴として保存し、最新案との差分要約を提供する。

### Requirement 2: アウトラインから文章生成
**Objective:** As a ライター, I want 構造化されたアウトラインから高品質な下書きを得たい, so that 文章制作時間を短縮しつつ品質を維持できる

#### Acceptance Criteria
1. When ユーザーが確定アウトラインを選択したとき, the Autonomous AI Writing Suite shall 各見出しに対応した文章ドラフトを完全な段落構成で生成する。
2. While 文章生成サイクルがアクティブな間, the Autonomous AI Writing Suite shall 生成→批判→考察→再生成ステップを提示し、批判ステップで検出した課題を再生成ステップに反映する。
3. If 批判ステップで論理欠落や事実不整合が検出された場合, then the Autonomous AI Writing Suite shall 再生成時に該当部分を修正したドラフトを提示する。
4. When ユーザーが推敲内容を承認したとき, the Autonomous AI Writing Suite shall 承認版を文書管理ストレージに保存し、承認タイムスタンプを付与する。
5. The Autonomous AI Writing Suite shall 文章生成中に対象となる文章種別（例：小説、説明文、技術文書）ごとのプロンプトテンプレートを適用し、テンプレート適用履歴を記録する。

### Requirement 3: パーソナライゼーションと質問管理
**Objective:** As a エディター, I want 読者属性やブランドトーンを再利用可能なパラメータとして管理したい, so that 記事ごとに一貫したパーソナライゼーションを実現できる

#### Acceptance Criteria
1. When ユーザーが質問回答からパーソナライズ要素を抽出するよう指定したとき, the Autonomous AI Writing Suite shall 回答内容を解析し、パラメータ候補を提示する。
2. When ユーザーがパーソナライズパラメータを保存したとき, the Autonomous AI Writing Suite shall パラメータ名・値・説明・有効フラグを設定可能な形でストレージに保存する。
3. Where パーソナライズパラメータがONになっている場合, the Autonomous AI Writing Suite shall 文章生成時に該当パラメータを適用した出力を生成する。
4. If ユーザーが特定パラメータをOFFに切り替えた場合, then the Autonomous AI Writing Suite shall 次回生成から当該パラメータを適用しない。
5. The Autonomous AI Writing Suite shall すべての質問・回答・パラメータ適用履歴を監査ログとして保持し、日時と実行ユーザーを記録する。

### Requirement 4: 文章とバージョン管理
**Objective:** As a ドキュメントマネージャー, I want 文章ドラフトと最終版を体系的に保存・比較したい, so that 改訂の追跡と復元を効率化できる

#### Acceptance Criteria
1. When ユーザーがドラフト保存を要求したとき, the Autonomous AI Writing Suite shall 指定フォルダ構成に基づきファイルを作成し、バージョンメタデータを付与する。
2. When ユーザーがGitコミット連携を要求したとき, the Autonomous AI Writing Suite shall 差分内容のプレビューを提示し、ユーザー確認後にバージョン管理操作を実行する。
3. If 保存処理で競合が検出された場合, then the Autonomous AI Writing Suite shall ユーザーに解消オプション（上書き、マージ、キャンセル）を提示する。
4. While 過去バージョンの比較ビューが開かれている間, the Autonomous AI Writing Suite shall 選択された2バージョンの差分をセクション単位で表示する。
5. The Autonomous AI Writing Suite shall 既存文章をインポートした際に原文と変更履歴を関連付けて保存する。

### Requirement 5: 既存文章の加筆・推敲とプロバイダー連携
**Objective:** As a コンテンツストラテジスト, I want 既存文章の加筆・推敲と複数モデル提供者の切り替えを制御したい, so that 運用要件に応じた柔軟な生成を実現できる

#### Acceptance Criteria
1. When ユーザーが既存文章をアップロードしたとき, the Autonomous AI Writing Suite shall 構成要素（段落・セクション）を解析し、編集対象をハイライト表示する。
2. If 推敲フェーズで改善提案が拒否された場合, then the Autonomous AI Writing Suite shall 代替案を提示するか現状維持を記録する。
3. Where 特定プロバイダーが利用可能に設定されている場合, the Autonomous AI Writing Suite shall 指定されたプロバイダー経由で生成リクエストを送信する。
4. When ユーザーがプロバイダー設定を変更したとき, the Autonomous AI Writing Suite shall 新設定を検証し、成功または失敗の結果を表示する。
5. The Autonomous AI Writing Suite shall 全プロバイダーごとの利用統計（回数・所要時間・成功率）を集計し、ダッシュボードに提供する。

### Requirement 6: ライティングテンプレート作成と適用
**Objective:** As a スタイルディレクター, I want ライティングテンプレートを定義しポイント単位で指示を適用したい, so that 記事ごとに一貫した文章スタイルを維持できる

#### Acceptance Criteria
1. When ユーザーがライティングテンプレート作成を開始したとき, the Autonomous AI Writing Suite shall セクション構造・各ポイントの書き方指示・語調ガイドラインを入力できるフォームを提示する。
2. When ユーザーがテンプレートを保存したとき, the Autonomous AI Writing Suite shall 各ポイントの指示内容と優先度をテンプレートメタデータとして保存する。
3. Where テンプレートがアウトラインまたは文章生成に割り当てられている場合, the Autonomous AI Writing Suite shall 各ポイントの生成ステップで対応する指示をAIエージェントに付与する。
4. If ユーザーが生成中に特定ポイントの指示を調整した場合, then the Autonomous AI Writing Suite shall 調整内容をテンプレートからの一時上書きとして記録し、再生成ステップに反映する。
5. The Autonomous AI Writing Suite shall テンプレート適用の有無とポイントごとの遵守状況をレポートとして提示する。
6. While ライティングテンプレートが適用されている間, the Autonomous AI Writing Suite shall 各ポイント処理を生成→批判→再生成の順序で進行させ、各段階の完了確認を取得する。
7. When AIエージェントが特定ポイントのガイダンスを必要としたとき, the Autonomous AI Writing Suite shall 該当テンプレート指示を自動で参照し、生成プロンプトに組み込む。

### Requirement 7: WebviewベースGUIインターフェース
**Objective:** As a ユーザー, I want Webviewを通じて全ての機能にGUIでアクセスしたい, so that コマンドパレットを使わずに直感的に操作できる

#### Acceptance Criteria
1. When ユーザーがAI Writerビューを開いたとき, the Autonomous AI Writing Suite shall メインダッシュボードWebviewを表示し、アウトライン生成・ドラフト生成・設定の各機能へアクセスできるボタンを提供する。
2. When ユーザーが設定パネルを開いたとき, the Autonomous AI Writing Suite shall AI Provider設定、テンプレート管理、ペルソナ管理をタブ形式のGUIで表示し、各項目を編集・保存できるようにする。
3. Where アウトライン生成またはドラフト生成が実行されている場合, the Autonomous AI Writing Suite shall 処理の進捗をWebview上でリアルタイムに表示し、各ステップ（生成・批判・考察・質問・再生成）の状態を視覚的に示す。
4. When AIからの出力がストリーミングで返されたとき, the Autonomous AI Writing Suite shall 出力内容をWebview上でリアルタイムに追記表示し、ユーザーが途中経過を確認できるようにする。
5. The Autonomous AI Writing Suite shall 既存のコマンドパレット経由の実行も維持し、WebviewとCommandの両方から同じ機能を実行可能にする。
6. While Webviewが表示されている間, the Autonomous AI Writing Suite shall セッション一覧、テンプレート一覧、ペルソナ一覧を更新可能な状態で保ち、選択したアイテムの詳細をサイドパネルまたはモーダルで表示する。
7. If ユーザーがWebview上でエラーが発生した場合, then the Autonomous AI Writing Suite shall エラーメッセージをWebview内に表示し、リトライまたはキャンセルのオプションを提供する。

### Requirement 8: リアルタイムストリーミング処理と途中経過表示
**Objective:** As a ユーザー, I want AI処理の途中経過をリアルタイムで確認したい, so that 生成内容を早期に把握し、必要に応じて中断や調整ができる

#### Acceptance Criteria
1. When AIモデルがテキスト生成を開始したとき, the Autonomous AI Writing Suite shall ストリーミングAPIを使用し、生成されたテキストをチャンク単位でWebviewへ送信する。
2. Where 生成ステップまたは再生成ステップが実行中の場合, the Autonomous AI Writing Suite shall 受信したテキストチャンクを即座にWebviewの該当ステップ領域に追記し、スクロール位置を最新部分に自動調整する。
3. When ユーザーがストリーミング中の処理を中断したとき, the Autonomous AI Writing Suite shall ストリーミングを停止し、それまでに受信した部分結果を保存するか破棄するかの選択肢を提示する。
4. If ストリーミング中にネットワークエラーまたはタイムアウトが発生した場合, then the Autonomous AI Writing Suite shall エラー内容をWebviewに表示し、再試行オプションを提供する。
5. The Autonomous AI Writing Suite shall ストリーミング処理中に「処理中」インジケーターを表示し、ユーザーが処理状態を常に把握できるようにする。
6. While 複数ステップが連続して実行される場合, the Autonomous AI Writing Suite shall 各ステップの開始・完了をタイムスタンプ付きでWebviewに記録し、全体の進捗を可視化する。


