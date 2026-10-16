import type { QuizQuestion } from "../lib/quiz";

export type PillarId = "basics" | "customize" | "harness";

export interface SourceLink {
  label: string;
  url: string;
}

export interface LessonMeta {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  goals: string[];
  sources: SourceLink[];
  quiz: QuizQuestion[];
}

export interface Pillar {
  id: PillarId;
  number: string;
  title: string;
  tagline: string;
  description: string;
  lessons: LessonMeta[];
}

export const PI_VERSION = "1.3.0";
const REPO = "https://github.com/earendil-works/pi/blob/main";
const doc = (name: string, label: string): SourceLink => ({
  label,
  url: `${REPO}/packages/coding-agent/docs/${name}.md`,
});

export const pillars: Pillar[] = [
  {
    id: "basics",
    number: "01",
    title: "Pi の基本",
    tagline: "インストールから、セッションを自在に操るまで",
    description:
      "Pi がどんな思想で作られたツールなのかを押さえ、ターミナルでの操作、エージェントループの仕組み、ツリー構造のセッションを体験しながら学びます。",
    lessons: [
      {
        id: "what-is-pi",
        title: "Pi とは：自分のものにできるエージェントハーネス",
        summary: "最小限のコアと、あとから足す拡張性。Pi の設計思想と全体像をつかむ。",
        minutes: 8,
        goals: [
          "「エージェントハーネス」という言葉の意味を説明できる",
          "Pi があえて同梱しない機能と、その理由を知る",
          "4 つの利用モードと、セキュリティ上の前提を理解する",
        ],
        sources: [
          { label: "README（リポジトリ）", url: `${REPO}/README.md` },
          doc("index", "Documentation index"),
          doc("security", "Security"),
        ],
        quiz: [
          {
            id: "q1",
            question: "Pi が標準では同梱せず、「必要なら作るかパッケージを入れる」としている機能はどれ？",
            options: [
              "ファイルの読み書きツール",
              "サブエージェントとプランモード",
              "セッションの保存",
              "モデルの切り替え",
            ],
            answer: 1,
            explanation:
              "Pi は強力なデフォルトを備えつつ、サブエージェントやプランモードのような機能はあえて省いています。必要なら Pi 自身に作らせるか、パッケージを入れます。",
          },
          {
            id: "q2",
            question: "Pi のツール実行の権限について正しいものは？",
            options: [
              "Pi はすべてのツール呼び出しの前に必ず確認を求める",
              "組み込みのサンドボックスがファイルアクセスを制限する",
              "Pi を起動したプロセスと同じ OS 権限で動く。隔離したいならコンテナなどを使う",
              "プロジェクトを信頼するとツールがサンドボックス化される",
            ],
            answer: 2,
            explanation:
              "Pi には組み込みのパーミッションシステムがありません。プロジェクトの信頼（trust）は読み込むリソースを決めるだけで、ツール呼び出しを隔離はしません。",
          },
          {
            id: "q3",
            question: "Pi の 4 つの使い方の組み合わせとして正しいものは？",
            options: [
              "対話モード・print/JSON モード・RPC モード・SDK",
              "対話モード・Web UI・REST API・SDK",
              "CLI・GUI・VS Code 拡張・SDK",
              "対話モード・バッチモード・デーモンモード・プラグイン",
            ],
            answer: 0,
            explanation:
              "ターミナルでの対話、print/JSON によるスクリプト利用、RPC による別プロセス制御、TypeScript SDK による組み込みの 4 つです。",
          },
        ],
      },
      {
        id: "first-run",
        title: "インストールと最初のタスク",
        summary: "インストール、/login でのモデル接続、@ でのファイル指定まで、最初の 10 分を体験する。",
        minutes: 10,
        goals: [
          "Pi をインストールして起動できる",
          "/login と /model でモデルを選べる",
          "最初のタスクを依頼し、結果を確認できる",
        ],
        sources: [doc("quickstart", "Quickstart"), doc("models", "Choose a Model")],
        quiz: [
          {
            id: "q1",
            question: "npm で Pi をインストールするときに必要な Node.js のバージョンは？",
            options: ["18 以上", "20.0 以上", "22.19 以上", "Node.js は不要"],
            answer: 2,
            explanation:
              "npm でのインストールには Node.js 22.19 以上が必要です。インストーラーなら必要に応じて Node.js も入れてくれます。",
          },
          {
            id: "q2",
            question: "組み込みプロバイダーのサブスクリプションや API キーを接続する最初の一手は？",
            options: [
              "models.json を編集する",
              "Pi の中で /login を実行する",
              "pi install を実行する",
              "AGENTS.md に API キーを書く",
            ],
            answer: 1,
            explanation:
              "組み込みプロバイダーなら /login から始めます。models.json は Pi が知らないエンドポイントを足すときに使います。",
          },
          {
            id: "q3",
            question: "同じフォルダで、直前のセッションを再開するコマンドは？",
            options: ["pi --resume", "pi --continue", "pi --session last", "pi --fork"],
            answer: 1,
            explanation:
              "pi --continue（-c）はそのフォルダの最新セッションを開きます。--resume は一覧から選ぶピッカーです。",
          },
        ],
      },
      {
        id: "interactive",
        title: "対話モードを使いこなす",
        summary: "@ によるファイル添付、! によるシェル実行、steer と follow-up の違いをターミナルで試す。",
        minutes: 12,
        goals: [
          "@・!・!! の使い分けができる",
          "作業中の Pi に Enter（steer）と Alt+Enter（follow-up）で指示を送れる",
          "よく使うスラッシュコマンドとショートカットを知る",
        ],
        sources: [
          doc("usage", "Use Pi in the terminal"),
          doc("slash-commands", "Slash commands"),
          doc("keybindings", "Keybindings"),
        ],
        quiz: [
          {
            id: "q1",
            question: "コマンドを実行するが、その出力をモデルに送りたくないときの書き方は？",
            options: ["!git status", "!!git status", "@git status", "/bash git status"],
            answer: 1,
            explanation: "! は実行して出力を会話に含めます。!! は実行するだけで、出力をモデルに送りません。",
          },
          {
            id: "q2",
            question: "Pi が作業中に Enter で送ったメッセージはいつ反映される？",
            options: [
              "すぐに現在のツール呼び出しを中断して反映される",
              "現在の応答とそのツール呼び出しが終わったあと、次の応答の前に反映される",
              "タスク全体が終わってから反映される",
              "反映されず破棄される",
            ],
            answer: 1,
            explanation:
              "Enter は steer。現在の応答とツール呼び出しの完了を待って次の応答を導きます。タスク全体の終了を待つのは Alt+Enter の follow-up です。",
          },
          {
            id: "q3",
            question: "Esc で作業を中断したとき、キューに積んでいたメッセージはどうなる？",
            options: ["削除される", "そのまま送信される", "エディターに戻される", "次回起動時に送られる"],
            answer: 2,
            explanation: "中断するとキュー内のメッセージはエディターに戻されるので、書き直して送り直せます。",
          },
        ],
      },
      {
        id: "how-pi-works",
        title: "Pi の仕組み：エージェントループとコンテキスト",
        summary: "1 回の依頼が「ターン」を繰り返して進む様子と、モデルに渡る情報の組み立てを見る。",
        minutes: 10,
        goals: [
          "ターンとエージェントループの関係を説明できる",
          "モデルリクエストに含まれる要素を挙げられる",
          "スキルが「必要なときだけ」読み込まれる理由を理解する",
        ],
        sources: [doc("how-pi-works", "How Pi Works")],
        quiz: [
          {
            id: "q1",
            question: "Pi における「1 ターン」とは？",
            options: [
              "ユーザーが 1 回メッセージを送ること",
              "1 回のモデル応答と、その中のツール呼び出しの実行まで",
              "セッションを 1 つ作ること",
              "1 つのツールを実行すること",
            ],
            answer: 1,
            explanation:
              "アシスタントの応答をストリーミングし、含まれるツール呼び出しを実行して結果を記録するまでが 1 ターンです。結果がさらに応答を必要とすれば次のターンが始まります。",
          },
          {
            id: "q2",
            question: "起動時にシステムプロンプトへ入るスキルの情報は？",
            options: [
              "SKILL.md の全文",
              "スキルの名前・説明・パスだけ",
              "スキルに同梱したスクリプト",
              "何も入らない",
            ],
            answer: 1,
            explanation:
              "起動時には名前と説明（とパス）だけを載せ、タスクが合致したときにモデルが SKILL.md を読みます。コンテキストを節約する仕組みです。",
          },
          {
            id: "q3",
            question: "次のモデルリクエストの会話履歴として使われるのは？",
            options: [
              "セッションファイル内の全ブランチ",
              "アクティブブランチ",
              "直前の 10 メッセージ",
              "最初のプロンプトだけ",
            ],
            answer: 1,
            explanation:
              "セッションはツリーで、現在のエントリーに至る経路（アクティブブランチ）だけが履歴になります。",
          },
        ],
      },
      {
        id: "sessions",
        title: "セッションとブランチ",
        summary: "/tree・/fork・/clone・/compact をツリー上で操作し、履歴を失わずに試行錯誤する方法を学ぶ。",
        minutes: 12,
        goals: [
          "セッションがツリー構造で保存されることを理解する",
          "/tree・/fork・/clone を使い分けられる",
          "コンパクションが何を置き換え、何を残すかを説明できる",
        ],
        sources: [
          doc("sessions", "Sessions and Context"),
          doc("session-format", "Session Format"),
          doc("compaction", "Compaction"),
        ],
        quiz: [
          {
            id: "q1",
            question: "別のアプローチを試したいが、同じセッションファイル内に並べて残したい。使うのは？",
            options: ["/tree", "/fork", "/clone", "/new"],
            answer: 0,
            explanation:
              "/tree は同じファイル内で移動します。/fork は以前のユーザーメッセージから新しいセッションを、/clone は現在の状態のコピーを作ります。",
          },
          {
            id: "q2",
            question: "コンパクション（/compact）の説明として正しいものは？",
            options: [
              "古いエントリーをセッションファイルから削除する",
              "要約エントリーを挿入し、以降のリクエストでは古いメッセージの代わりに要約を送る",
              "新しいセッションを作り直す",
              "ツール出力だけを削除する",
            ],
            answer: 1,
            explanation:
              "要約で古いメッセージを置き換えるのはモデルリクエスト上だけで、元のエントリーはツリーに残ります。",
          },
          {
            id: "q3",
            question: "/tree でユーザーメッセージを選んだときの動きは？",
            options: [
              "そのメッセージが削除される",
              "そのメッセージの本文がエディターに戻り、編集して送ると新しいブランチになる",
              "そのメッセージから新しいファイルが作られる",
              "そのメッセージがもう一度送信される",
            ],
            answer: 1,
            explanation:
              "ユーザーメッセージを選ぶと本文がエディターに戻ります。編集して送ると、元のブランチを残したまま分岐します。",
          },
        ],
      },
    ],
  },
  {
    id: "customize",
    number: "02",
    title: "Pi のカスタマイズ",
    tagline: "Pi をワークフローに合わせて作り変える",
    description:
      "AGENTS.md・プロンプトテンプレート・スキル・拡張機能・テーマ・パッケージ。「最小限の仕組みから始める」原則で、Pi の CLI そのものを自分仕様にしていきます。",
    lessons: [
      {
        id: "choose-mechanism",
        title: "カスタマイズの選び方",
        summary: "やりたいことに対して、最も小さな仕組みを選ぶ。質問に答えて最適解を見つける。",
        minutes: 6,
        goals: ["カスタマイズの仕組みを一覧で把握する", "要件から適切な仕組みを選べる"],
        sources: [doc("quickstart", "Quickstart — Choose how to customize Pi")],
        quiz: [
          {
            id: "q1",
            question: "「このリポジトリでは常にテストを先に書く」と Pi に守らせたい。最初に選ぶべきは？",
            options: ["拡張機能", "AGENTS.md", "カスタムプロバイダー", "テーマ"],
            answer: 1,
            explanation:
              "フォルダ単位で常に従ってほしい指示は AGENTS.md（コンテキストファイル）が最小の仕組みです。",
          },
          {
            id: "q2",
            question: "Ollama のような OpenAI 互換サーバーをつなぎたい。最初に検討するのは？",
            options: ["models.json", "スキル", "プロンプトテンプレート", "pi-tui"],
            answer: 0,
            explanation:
              "既存の API 形式を話すエンドポイントなら models.json で足ります。独自のプロトコルや認証が必要なときだけプロバイダー拡張を作ります。",
          },
        ],
      },
      {
        id: "configuration",
        title: "設定ファイルとコンテキストファイル",
        summary: "~/.pi/agent と .pi の役割、AGENTS.md・SYSTEM.md の読み込み、プロジェクトの信頼を整理する。",
        minutes: 10,
        goals: [
          "ユーザー設定とプロジェクト設定の場所を区別できる",
          "AGENTS.md と SYSTEM.md / APPEND_SYSTEM.md の違いを説明できる",
          "プロジェクトの信頼が何を制御するかを理解する",
        ],
        sources: [
          doc("configuration", "Configuration"),
          doc("settings", "Settings"),
          doc("security", "Security"),
        ],
        quiz: [
          {
            id: "q1",
            question: ".pi/APPEND_SYSTEM.md の役割は？",
            options: [
              "既定のシステムプロンプトを完全に置き換える",
              "プロジェクト固有の指示をシステムプロンプトに追加する",
              "セッションの保存先を変える",
              "拡張機能を読み込む",
            ],
            answer: 1,
            explanation:
              "SYSTEM.md は置き換え、APPEND_SYSTEM.md は追記です。信頼したプロジェクトのファイルがエージェントディレクトリのものより優先されます。",
          },
          {
            id: "q2",
            question: "プロジェクトの信頼（trust）が必要ないものは？",
            options: [
              ".pi/settings.json",
              ".pi/extensions/",
              "AGENTS.md などのコンテキストファイルの探索",
              ".pi/prompts/",
            ],
            answer: 2,
            explanation:
              "コンテキストファイルの探索は信頼を必要としません。.pi 配下の設定・拡張機能・テンプレートなどは信頼後に読み込まれます。",
          },
          {
            id: "q3",
            question: "手で設定ファイルを編集したあと、実行中のセッションに反映するには？",
            options: ["/reload", "/new", "/compact", "Pi の再インストール"],
            answer: 0,
            explanation:
              "/reload でキーバインド・拡張機能・スキル・テンプレート・テーマ・コンテキストファイルを読み直します。",
          },
        ],
      },
      {
        id: "prompt-templates",
        title: "プロンプトテンプレート",
        summary: "Markdown 1 枚で / コマンドを作る。引数の置換ルールをプレイグラウンドで確かめる。",
        minutes: 10,
        goals: [
          "テンプレートファイルを作って / コマンドにできる",
          "$1・$@・${1:-default}・${@:N:L} を使い分けられる",
        ],
        sources: [
          doc("prompt-templates", "Prompt Templates"),
          {
            label: "prompt-templates.ts（実装）",
            url: `${REPO}/packages/coding-agent/src/core/prompt-templates.ts`,
          },
        ],
        quiz: [
          {
            id: "q1",
            question: "~/.pi/agent/prompts/review.md を作ると、使えるコマンド名は？",
            options: ["/prompt review", "/review", "/skill:review", "/template:review"],
            answer: 1,
            explanation: "ファイル名がそのままコマンド名になります。",
          },
          {
            id: "q2",
            question: "引数 a b c で ${@:2} を展開すると？",
            options: ["a b", "b c", "b", "c"],
            answer: 1,
            explanation: "${@:N} は N 番目（1 始まり）以降のすべての引数です。",
          },
          {
            id: "q3",
            question: '/review "API compatibility" のときの $1 は？',
            options: ['"API', "API compatibility", "API", "（空）"],
            answer: 1,
            explanation: "引数はシェル風にクォートを解釈するので、空白を含む 1 つの引数になります。",
          },
        ],
      },
      {
        id: "skills",
        title: "スキル",
        summary:
          "SKILL.md と補助ファイルで、必要なときだけ読み込まれる専門手順を作る。バリデーターで書き方を確認する。",
        minutes: 12,
        goals: [
          "SKILL.md のフロントマターを正しく書ける",
          "モデルが選びやすい description を書ける",
          "スキルの読み込み方と /skill:name の使いどころを理解する",
        ],
        sources: [
          doc("skills", "Skills"),
          { label: "Agent Skills specification", url: "https://agentskills.io/specification" },
        ],
        quiz: [
          {
            id: "q1",
            question: "スキル名として有効なものは？",
            options: ["PDF-Tools", "pdf--tools", "pdf-tools", "-pdf-tools"],
            answer: 2,
            explanation:
              "小文字・数字・ハイフンのみ。先頭末尾のハイフンと連続ハイフンは不可、最大 64 文字です。",
          },
          {
            id: "q2",
            question:
              "モデルが自動で選ばず、/skill:name で明示したときだけ使わせたい。フロントマターに書くのは？",
            options: ["allowed-tools: none", "disable-model-invocation: true", "hidden: true", "auto: false"],
            answer: 1,
            explanation:
              "disable-model-invocation: true で自動選択の対象から外れ、明示的なコマンドでのみ使えます。",
          },
          {
            id: "q3",
            question: "description がないスキルはどうなる？",
            options: [
              "ディレクトリ名から自動生成される",
              "警告付きで読み込まれる",
              "読み込まれない",
              "最初の行が使われる",
            ],
            answer: 2,
            explanation:
              "description はモデルがスキルを選ぶための必須情報なので、ないスキルは読み込まれません。",
          },
        ],
      },
      {
        id: "extensions",
        title: "拡張機能（Extensions）",
        summary: "TypeScript でツール・コマンド・イベントハンドラーを足す。ビルダーでコードを組み立てる。",
        minutes: 18,
        goals: [
          "拡張機能のファクトリーと ExtensionAPI の役割を理解する",
          "registerTool・registerCommand・pi.on を使い分けられる",
          "ライフサイクルと状態管理の落とし穴を避けられる",
        ],
        sources: [
          doc("extensions", "Extensions"),
          {
            label: "拡張機能のサンプル集",
            url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions",
          },
          { label: "extensions/types.ts", url: `${REPO}/packages/coding-agent/src/core/extensions/types.ts` },
        ],
        quiz: [
          {
            id: "q1",
            question: "拡張機能でファイル監視やタイマーを始める場所として適切なのは？",
            options: [
              "export default のファクトリー関数の中",
              "session_start ハンドラーか、それを必要とするコマンド・ツールの中",
              "モジュールのトップレベル",
              "tool_result ハンドラー",
            ],
            answer: 1,
            explanation:
              "ファクトリーはセッションを開始せずに読み込まれることがあるため、長寿命のリソースは session_start などで始め、session_shutdown で冪等に片付けます。",
          },
          {
            id: "q2",
            question: "tool_call ハンドラーが例外を投げたときの Pi の振る舞いは？",
            options: [
              "ツールはそのまま実行される",
              "フェイルセーフとしてツールがブロックされる",
              "Pi が終了する",
              "例外は無視される",
            ],
            answer: 1,
            explanation:
              "tool_call ハンドラーの失敗は安全側に倒してツールをブロックします。ツール実行自体の失敗はモデルへのエラー結果になります。",
          },
          {
            id: "q3",
            question: "ブランチを移動しても正しく追従させたいツールの状態はどこに持つ？",
            options: ["グローバル変数", "外部のデータベース", "ツール結果の details", "process.env"],
            answer: 2,
            explanation:
              "ブランチに沿う状態はツール結果の details に保存し、session_start で getBranch() から再構築します。",
          },
        ],
      },
      {
        id: "themes-packages",
        title: "テーマと Pi パッケージ",
        summary: "配色を変えるテーマと、リソースをまとめて配布するパッケージ。読み込みフィルターを試す。",
        minutes: 12,
        goals: [
          "カスタムテーマを作って選べる",
          "パッケージの構成と package.json の pi マニフェストを書ける",
          "settings.json のフィルターで読み込むリソースを絞れる",
        ],
        sources: [doc("themes", "Themes"), doc("packages", "Pi Packages")],
        quiz: [
          {
            id: "q1",
            question: "パッケージの拡張機能が import する @earendil-works/pi-coding-agent はどこに宣言する？",
            options: [
              "dependencies に固定バージョンで",
              'peerDependencies に "*" で',
              "devDependencies のみ",
              "宣言しない",
            ],
            answer: 1,
            explanation:
              'Pi が提供するパッケージは peerDependencies に "*" で宣言し、バンドルしません。実体をコピーするとモジュールの重複が起きます。',
          },
          {
            id: "q2",
            question: 'settings.json のパッケージフィルターで "skills": [] と書くと？',
            options: [
              "すべてのスキルを読み込む",
              "スキルを 1 つも読み込まない",
              "エラーになる",
              "既定のスキルだけ読み込む",
            ],
            answer: 1,
            explanation: "プロパティ省略はすべて、空配列は何も読み込まない、という意味になります。",
          },
          {
            id: "q3",
            question: "npm のパッケージを Pi のパッケージギャラリーに載せるために必要なのは？",
            options: [
              "keywords に pi-package を入れる",
              "名前を pi- で始める",
              "pi.dev に申請する",
              "README を英語で書く",
            ],
            answer: 0,
            explanation: "keywords に pi-package を含めるとギャラリーでの発見対象になります。",
          },
        ],
      },
    ],
  },
  {
    id: "harness",
    number: "03",
    title: "独自 Harness を作る",
    tagline: "Pi のパッケージで、自分のエージェントを組み立てる",
    description:
      "pi-ai・pi-agent-core・pi-coding-agent SDK・RPC。Pi を形作るレイヤーを部品として使い、CLI の外で動く独自のエージェントハーネスを構築します。",
    lessons: [
      {
        id: "harness-layers",
        title: "Harness のレイヤー構造",
        summary: "Pi を構成するパッケージの積み重なりと、どの層から組み立てるべきかを見極める。",
        minutes: 8,
        goals: [
          "Pi のパッケージ構成と依存関係を説明できる",
          "カスタマイズ（02）と独自ハーネス（03）の違いを理解する",
          "要件に応じて使うレイヤーを選べる",
        ],
        sources: [
          { label: "README — Packages", url: `${REPO}/README.md#packages` },
          doc("cli-integration", "CLI Integration"),
        ],
        quiz: [
          {
            id: "q1",
            question: "複数プロバイダーの LLM を統一 API で呼ぶ層は？",
            options: [
              "@earendil-works/pi-ai",
              "@earendil-works/pi-tui",
              "@earendil-works/pi-agent-core",
              "@earendil-works/pi-coding-agent",
            ],
            answer: 0,
            explanation:
              "pi-ai がプロバイダー差を吸収する層で、pi-agent-core はその上にツール実行と状態管理を載せています。",
          },
          {
            id: "q2",
            question: "Python 製のアプリから Pi を別プロセスとして制御したい。適した方法は？",
            options: ["SDK を直接 import する", "RPC モード（pi --mode rpc）", "pi-tui", "テーマ"],
            answer: 1,
            explanation:
              "言語に依存せずプロセスを分けたいなら RPC モードです。Node.js / Bun の同一プロセスなら SDK を使います。",
          },
        ],
      },
      {
        id: "pi-ai",
        title: "pi-ai：モデル呼び出しの統一 API",
        summary:
          "Models コレクション、ストリーミングイベント、TypeBox のツール定義、テスト用の faux プロバイダー。",
        minutes: 12,
        goals: [
          "Models コレクションでモデルを取得してストリーミングできる",
          "ストリーミングイベントの順序と contentIndex の意味を理解する",
          "faux プロバイダーでテストを書ける",
        ],
        sources: [{ label: "pi-ai README", url: `${REPO}/packages/ai/README.md` }],
        quiz: [
          {
            id: "q1",
            question: "ストリーム中のテキスト・思考・ツール呼び出しのイベントについて正しいのは？",
            options: [
              "必ずブロックごとに連続して届く",
              "インターリーブして届くことがあるので contentIndex でブロックを対応付ける",
              "テキストは必ずツール呼び出しより先に届く",
              "done の後にも delta が届く",
            ],
            answer: 1,
            explanation:
              "異なるブロックのイベントは連続する保証がありません。contentIndex で対応するブロックを特定します。",
          },
          {
            id: "q2",
            question: "API キーなしで、決まった応答を返すテスト用のプロバイダーは？",
            options: ["fauxProvider()", "mockModel()", "dryRun: true", "streamProxy()"],
            answer: 0,
            explanation:
              "fauxProvider() は台本どおりの応答（テキスト・思考・ツール呼び出し）を返すインメモリのプロバイダーです。",
          },
        ],
      },
      {
        id: "agent-core",
        title: "pi-agent-core：エージェントループを組む",
        summary:
          "Agent クラスのイベント列とフック。シミュレーターでツール実行・steering・finishTurn の挙動を観察する。",
        minutes: 18,
        goals: [
          "prompt() が発行するイベントの順序を説明できる",
          "beforeToolCall / afterToolCall / prepareRequest / finishTurn の役割を理解する",
          "並列・逐次のツール実行と terminate の効き方を理解する",
        ],
        sources: [
          { label: "pi-agent-core README", url: `${REPO}/packages/agent/README.md` },
          { label: "agent-loop.ts（実装）", url: `${REPO}/packages/agent/src/agent-loop.ts` },
        ],
        quiz: [
          {
            id: "q1",
            question: "並列実行モードで、toolResult メッセージが発行される順序は？",
            options: [
              "ツールの完了順",
              "アシスタントが記述した順（ソース順）",
              "ランダム",
              "ツール名のアルファベット順",
            ],
            answer: 1,
            explanation:
              "tool_execution_end は完了順に出ますが、toolResult メッセージと turn_end.toolResults はアシスタントの記述順です。",
          },
          {
            id: "q2",
            question: "terminate: true が実際にループを止めるのはどんなとき？",
            options: [
              "どれか 1 つのツールが terminate を返したとき",
              "そのバッチで確定したすべてのツール結果が terminate を返したとき",
              "最後のツールが terminate を返したとき",
              "afterToolCall が存在するとき",
            ],
            answer: 1,
            explanation:
              "混在したバッチは通常どおり続きます。全結果が terminate のときだけ、ツール起因の次の LLM 呼び出しをスキップします。",
          },
          {
            id: "q3",
            question: 'finishTurn で常に { action: "continue" } を返すとどうなる？',
            options: ["1 回だけ続く", "無限ループになる", "エラーになる", "何も起きない"],
            answer: 1,
            explanation:
              "finishTurn は次のリクエストの後にもまた呼ばれるため、無条件の continue は終わらないループを作ります。条件で守る必要があります。",
          },
        ],
      },
      {
        id: "sdk",
        title: "SDK で Pi を組み込む",
        summary:
          "createAgentSession で Pi 本体をアプリに埋め込む。各境界を差し替えるコードをビルダーで生成する。",
        minutes: 15,
        goals: [
          "createAgentSession の既定の動きを理解する",
          "SessionManager・ResourceLoader・ツール選択を差し替えられる",
          "dispose とイベント購読の作法を守れる",
        ],
        sources: [
          doc("sdk", "SDK"),
          {
            label: "SDK のサンプル集",
            url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/sdk",
          },
        ],
        quiz: [
          {
            id: "q1",
            question: "セッションファイルを作らない SDK セッションにするには？",
            options: [
              "sessionManager: SessionManager.inMemory()",
              "persist: false",
              "noSession: true を prompt に渡す",
              "agentDir を空にする",
            ],
            answer: 0,
            explanation: "SessionManager.inMemory() を渡すと履歴はメモリ上だけに保持されます。",
          },
          {
            id: "q2",
            question: "実行中のセッションに prompt() を steer か follow-up か指定せずに呼ぶと？",
            options: [
              "自動的に follow-up になる",
              "拒否される",
              "現在の実行が中断される",
              "並行して 2 つ目の実行が始まる",
            ],
            answer: 1,
            explanation:
              "推測で振る舞いを決めず拒否します。steer() / followUp() を使うか、挙動を明示します。",
          },
          {
            id: "q3",
            question: "SDK セッションで codemode や MCP を使うには？",
            options: [
              "何もしなくても CLI と同じく読み込まれる",
              "DefaultResourceLoader の extensionFactories に createCodemodeExtension() などを追加する",
              "settings.json に mcp: true と書く",
              "SDK では使えない",
            ],
            answer: 1,
            explanation:
              "CLI では組み込み拡張として読み込まれますが、SDK セッションでは自分で extensionFactories に追加します。",
          },
        ],
      },
      {
        id: "rpc-modes",
        title: "RPC・JSON モードで外部から制御",
        summary:
          "print・JSON・RPC の 3 モードと、JSONL プロトコルのコマンド・応答・イベントをプレイグラウンドで送受信する。",
        minutes: 14,
        goals: [
          "print / JSON / RPC モードを使い分けられる",
          "コマンドと応答を id で対応付けられる",
          "agent_end と agent_settled の違いを説明できる",
        ],
        sources: [
          doc("rpc", "RPC Mode"),
          doc("rpc-commands", "RPC Commands"),
          doc("json", "JSON Event Stream"),
          doc("cli-integration", "CLI Integration"),
        ],
        quiz: [
          {
            id: "q1",
            question: "prompt コマンドの応答で success: true が意味するのは？",
            options: [
              "モデルの作業が完了した",
              "プロンプトが受理・キュー投入・処理された",
              "ツールがすべて成功した",
              "セッションが保存された",
            ],
            answer: 1,
            explanation:
              "応答は受け付けたことを示すだけです。作業の進行はイベントで受け取り、完了は agent_settled で判断します。",
          },
          {
            id: "q2",
            question: "Pi がもう自動で続行しない（リトライやキュー処理も終わった）ことを示すイベントは？",
            options: ["agent_end", "turn_end", "agent_settled", "message_end"],
            answer: 2,
            explanation:
              "agent_end は低レベルの実行 1 回の終わりで、その後にリトライやキュー処理が続くことがあります。",
          },
          {
            id: "q3",
            question: "Node.js で RPC の stdout を読むときに readline を避けるべき理由は？",
            options: [
              "遅いから",
              "U+2028 / U+2029 でも行を分割してしまい、JSON 文字列の途中で切れるから",
              "UTF-8 を扱えないから",
              "Windows で動かないから",
            ],
            answer: 1,
            explanation:
              "RPC は LF のみで区切る厳密な JSONL です。Unicode の行区切り文字は JSON 文字列中に現れ得ます。",
          },
        ],
      },
      {
        id: "build-harness",
        title: "ハンズオン：独自 Harness を作る",
        summary: "読み取り専用のレビュー用ハーネスを、ステップごとに組み立てる。仕上げに設計判断を振り返る。",
        minutes: 25,
        goals: [
          "要件からレイヤーと境界を選び、ハーネスを設計できる",
          "カスタムツール・ガード・イベント出力を備えたハーネスを実装できる",
          "テストと運用時の注意点を押さえる",
        ],
        sources: [
          doc("sdk", "SDK"),
          { label: "pi-agent-core README", url: `${REPO}/packages/agent/README.md` },
          { label: "pi-durable README（実験的）", url: `${REPO}/packages/durable/README.md` },
        ],
        quiz: [
          {
            id: "q1",
            question: "CI でコードレビューだけをさせたいハーネスのツール選択として最も安全なのは？",
            options: [
              'tools: ["read", "bash", "edit", "write"]',
              'tools: ["read", "grep", "find", "ls"]',
              "ツールを指定しない",
              'tools: ["bash"]',
            ],
            answer: 1,
            explanation:
              "読み取り専用のツールに絞れば、モデルがファイルを書き換えたりコマンドを実行したりできません。tools は許可リストなので、customTools を使う場合はその名前も加えます。",
          },
          {
            id: "q2",
            question: "ハーネスのテストで、本物の API を呼ばずにエージェントループを検証する方法は？",
            options: [
              "fauxProvider() で台本の応答を返す",
              "API キーを空にする",
              "dispose() を先に呼ぶ",
              "print モードで実行する",
            ],
            answer: 0,
            explanation:
              "pi-ai の faux プロバイダーで応答（ツール呼び出し含む）を決め打ちにすれば、決定的なテストが書けます。",
          },
        ],
      },
    ],
  },
];

export interface LessonLocation {
  pillar: Pillar;
  lesson: LessonMeta;
  index: number;
  prev?: { pillar: Pillar; lesson: LessonMeta };
  next?: { pillar: Pillar; lesson: LessonMeta };
}

const flat = pillars.flatMap((pillar) => pillar.lessons.map((lesson) => ({ pillar, lesson })));

export function findPillar(id: string | undefined): Pillar | undefined {
  return pillars.find((p) => p.id === id);
}

export function findLesson(
  pillarId: string | undefined,
  lessonId: string | undefined,
): LessonLocation | undefined {
  const position = flat.findIndex((entry) => entry.pillar.id === pillarId && entry.lesson.id === lessonId);
  if (position === -1) return undefined;
  const { pillar, lesson } = flat[position];
  return {
    pillar,
    lesson,
    index: pillar.lessons.indexOf(lesson),
    prev: flat[position - 1],
    next: flat[position + 1],
  };
}

export function lessonKey(pillarId: string, lessonId: string): string {
  return `${pillarId}/${lessonId}`;
}

export const totalLessons = flat.length;
