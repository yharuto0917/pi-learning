// Pi の対話モードを模倣するターミナルシミュレーターの入力解釈

export type LineKind =
  | "user"
  | "assistant"
  | "tool"
  | "system"
  | "muted"
  | "error"
  | "accent"
  | "queue"
  | "output";

export interface TermLine {
  kind: LineKind;
  text: string;
}

export interface TermState {
  model: string;
  thinking: string;
  loggedIn: boolean;
  sessionName?: string;
  messageCount: number;
  contextItems: string[];
}

export interface RunRequest {
  prompt: string;
  attachments: string[];
}

export interface InterpretResult {
  state: TermState;
  lines: TermLine[];
  run?: RunRequest;
  clear?: boolean;
}

export const SAMPLE_FILES = ["README.md", "package.json", "src/index.ts", "meeting-notes.md"];

export const MODELS = ["anthropic/claude-sonnet-4-6", "openai/gpt-4o-mini", "ollama/qwen2.5-coder:7b"];
export const THINKING = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

export const SLASH_COMMANDS: { name: string; description: string }[] = [
  { name: "/login", description: "プロバイダーの認証を追加" },
  { name: "/model", description: "モデルを選ぶ（Ctrl+L）" },
  { name: "/thinking", description: "思考レベルを選ぶ（Shift+Tab で切替）" },
  { name: "/session", description: "セッション情報を表示" },
  { name: "/name", description: "セッションに名前を付ける" },
  { name: "/new", description: "新しいセッションを始める" },
  { name: "/tree", description: "セッションツリーを移動" },
  { name: "/compact", description: "コンテキストを要約して圧縮" },
  { name: "/copy", description: "最後の応答をコピー（Ctrl+X）" },
  { name: "/export", description: "HTML / JSONL でエクスポート" },
  { name: "/reload", description: "拡張機能・スキル・テンプレートを再読み込み" },
  { name: "/hotkeys", description: "有効なショートカットを表示" },
];

export function createTermState(): TermState {
  return {
    model: MODELS[0],
    thinking: "medium",
    loggedIn: false,
    messageCount: 0,
    contextItems: [],
  };
}

const sys = (text: string): TermLine => ({ kind: "system", text });
const muted = (text: string): TermLine => ({ kind: "muted", text });

/** `!cmd` で実行するコマンドの擬似出力 */
export function fakeShell(command: string): string[] {
  const cmd = command.trim();
  if (cmd.startsWith("git status"))
    return ["On branch main", "Changes not staged for commit:", "  modified:   src/index.ts"];
  if (cmd === "ls" || cmd.startsWith("ls "))
    return SAMPLE_FILES.filter((f) => !f.includes("/")).concat(["src/"]);
  if (cmd.startsWith("pwd")) return ["/home/you/project"];
  if (cmd.startsWith("echo ")) return [cmd.slice(5)];
  return [`(シミュレーション) ${cmd} を実行しました`];
}

/** プロンプト中の @path を取り出す */
export function extractAttachments(prompt: string): string[] {
  const matches = prompt.match(/@([\w./-]+)/g) ?? [];
  return matches.map((m) => m.slice(1));
}

export function interpretInput(state: TermState, raw: string): InterpretResult {
  const input = raw.trim();
  if (!input) return { state, lines: [] };

  if (input.startsWith("!!")) {
    const command = input.slice(2);
    return {
      state,
      lines: [
        { kind: "user", text: input },
        ...fakeShell(command).map((t) => ({ kind: "output" as const, text: t })),
        muted("!! なので出力はモデルに送られません"),
      ],
    };
  }

  if (input.startsWith("!")) {
    const command = input.slice(1);
    return {
      state: {
        ...state,
        messageCount: state.messageCount + 1,
        contextItems: [...state.contextItems, `$ ${command} の出力`],
      },
      lines: [
        { kind: "user", text: input },
        ...fakeShell(command).map((t) => ({ kind: "output" as const, text: t })),
        { kind: "accent", text: "→ 出力を会話に追加しました（次のリクエストでモデルが読めます）" },
      ],
    };
  }

  if (input.startsWith("/")) return interpretSlash(state, input);

  if (!state.loggedIn) {
    return {
      state,
      lines: [
        { kind: "user", text: input },
        { kind: "error", text: "使えるモデルがありません。まず /login でプロバイダーに接続してください" },
      ],
    };
  }

  const attachments = extractAttachments(input);
  const unknown = attachments.filter((a) => !SAMPLE_FILES.includes(a));
  if (unknown.length > 0) {
    return {
      state,
      lines: [
        { kind: "user", text: input },
        { kind: "error", text: `ファイルが見つかりません: ${unknown.join(", ")}` },
      ],
    };
  }

  return {
    state: {
      ...state,
      messageCount: state.messageCount + 1,
      contextItems: [...state.contextItems, ...attachments.map((a) => `@${a} の内容`)],
    },
    lines: [{ kind: "user", text: input }, ...attachments.map((a) => muted(`📎 ${a} を添付`))],
    run: { prompt: input, attachments },
  };
}

function interpretSlash(state: TermState, input: string): InterpretResult {
  const [command, ...rest] = input.split(/\s+/);
  const arg = rest.join(" ");
  const echo: TermLine = { kind: "user", text: input };

  switch (command) {
    case "/":
      return {
        state,
        lines: [echo, ...SLASH_COMMANDS.map((c) => muted(`${c.name.padEnd(10)} ${c.description}`))],
      };
    case "/login":
      return {
        state: { ...state, loggedIn: true },
        lines: [
          echo,
          sys("プロバイダーを選択: Anthropic / OpenAI / Google / OpenRouter …"),
          sys("✓ 認証情報を ~/.pi/agent/auth.json に保存しました"),
        ],
      };
    case "/logout":
      return { state: { ...state, loggedIn: false }, lines: [echo, sys("認証情報を削除しました")] };
    case "/model": {
      if (arg) {
        const found = MODELS.find((m) => m.includes(arg));
        if (!found)
          return { state, lines: [echo, { kind: "error", text: `モデルが見つかりません: ${arg}` }] };
        return { state: { ...state, model: found }, lines: [echo, sys(`モデルを ${found} に変更しました`)] };
      }
      return {
        state,
        lines: [
          echo,
          ...MODELS.map((m) => muted(`${m === state.model ? "›" : " "} ${m}`)),
          muted("例: /model gpt で切り替え。Ctrl+S で新しいセッションの既定に保存"),
        ],
      };
    }
    case "/thinking": {
      if (arg && THINKING.includes(arg)) {
        return { state: { ...state, thinking: arg }, lines: [echo, sys(`思考レベル: ${arg}`)] };
      }
      return {
        state,
        lines: [echo, muted(`利用できるレベル: ${THINKING.join(" / ")}（例: /thinking high）`)],
      };
    }
    case "/session":
      return {
        state,
        lines: [
          echo,
          sys(
            `ファイル: ~/.pi/agent/sessions/--home-you-project--/${state.sessionName ?? "2026-10-16T12-00-00"}.jsonl`,
          ),
          sys(`メッセージ数: ${state.messageCount}　モデル: ${state.model}　思考: ${state.thinking}`),
        ],
      };
    case "/name":
      if (!arg) return { state, lines: [echo, sys(`現在の名前: ${state.sessionName ?? "（未設定）"}`)] };
      return {
        state: { ...state, sessionName: arg },
        lines: [echo, sys(`セッション名を「${arg}」にしました`)],
      };
    case "/new":
      return {
        state: { ...state, messageCount: 0, contextItems: [], sessionName: undefined },
        lines: [sys("新しいセッションを開始しました")],
        clear: true,
      };
    case "/compact":
      if (state.contextItems.length === 0 && state.messageCount === 0) {
        return { state, lines: [echo, muted("圧縮する履歴がありません")] };
      }
      return {
        state: { ...state, contextItems: ["（要約）これまでの会話"] },
        lines: [echo, sys("古い履歴を要約しました。元のエントリーはセッションファイルに残ります")],
      };
    case "/tree":
      return {
        state,
        lines: [echo, muted("ツリーの操作は「セッションとブランチ」のレッスンで体験できます")],
      };
    case "/copy":
      return { state, lines: [echo, sys("最後のアシスタント応答をクリップボードにコピーしました")] };
    case "/export":
      return { state, lines: [echo, sys(`セッションを ${arg || "session.html"} に書き出しました`)] };
    case "/reload":
      return {
        state,
        lines: [
          echo,
          sys(
            "キーバインド・拡張機能・スキル・テンプレート・テーマ・コンテキストファイルを再読み込みしました",
          ),
        ],
      };
    case "/hotkeys":
      return {
        state,
        lines: [
          echo,
          muted("Enter 送信 / steer　Alt+Enter follow-up　Esc 中断"),
          muted("Ctrl+L モデル選択　Shift+Tab 思考レベル　Ctrl+O ツール出力の展開"),
          muted("Ctrl+T 思考ブロックの表示　Ctrl+G 外部エディター　Ctrl+X コピー"),
        ],
      };
    default:
      return { state, lines: [echo, { kind: "error", text: `不明なコマンド: ${command}（/ で一覧）` }] };
  }
}

/** プロンプトに応じた擬似的なツール呼び出しの台本 */
export function scriptForPrompt(request: RunRequest): TermLine[] {
  const steps: TermLine[] = [];
  for (const file of request.attachments) steps.push({ kind: "tool", text: `read ${file}` });
  if (/テスト|test/i.test(request.prompt)) steps.push({ kind: "tool", text: "bash npm test" });
  if (/構成|structure|説明/.test(request.prompt))
    steps.push({ kind: "tool", text: "ls ." }, { kind: "tool", text: "read package.json" });
  if (/保存|書いて|save|write/i.test(request.prompt))
    steps.push({ kind: "tool", text: "write action-items.md" });
  if (steps.length === 0) steps.push({ kind: "tool", text: 'grep -r "TODO" src' });
  return steps;
}
