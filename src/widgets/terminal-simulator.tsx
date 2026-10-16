import { type KeyboardEvent, useEffect, useReducer, useRef, useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import {
  createTermState,
  interpretInput,
  SAMPLE_FILES,
  SLASH_COMMANDS,
  scriptForPrompt,
  type TermLine,
  type TermState,
} from "../lib/terminal-sim";

export type MissionId =
  | "login"
  | "model"
  | "run"
  | "attach"
  | "bang"
  | "bangbang"
  | "steer"
  | "followup"
  | "abort"
  | "session";

export interface Mission {
  id: MissionId;
  label: string;
}

interface Run {
  steps: TermLine[];
  index: number;
}

interface SimState {
  term: TermState;
  lines: TermLine[];
  run: Run | null;
  steering: string[];
  followUp: string[];
  achieved: MissionId[];
  restored: string | null;
}

type Action =
  | { type: "submit"; text: string }
  | { type: "follow-up"; text: string }
  | { type: "abort" }
  | { type: "tick" }
  | { type: "reset" };

const WELCOME: TermLine[] = [
  { kind: "muted", text: "pi v1.3.0 — 読み込み済み: AGENTS.md, skills (2), prompts (1)" },
  { kind: "muted", text: "ヒント: / でコマンド一覧、@ でファイル添付、! でシェル実行" },
];

function initialState(): SimState {
  return {
    term: createTermState(),
    lines: WELCOME,
    run: null,
    steering: [],
    followUp: [],
    achieved: [],
    restored: null,
  };
}

function achieve(state: SimState, ...ids: MissionId[]): MissionId[] {
  const set = new Set(state.achieved);
  for (const id of ids) set.add(id);
  return [...set];
}

function startRun(steps: TermLine[]): Run {
  return {
    steps: [...steps, { kind: "assistant", text: "完了しました。変更点と結果を上にまとめています。" }],
    index: 0,
  };
}

function reducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case "reset":
      return initialState();
    case "submit": {
      const text = action.text.trim();
      if (!text) return state;
      if (state.run) {
        // 実行中の Enter は steering としてキューに入る
        return {
          ...state,
          steering: [...state.steering, text],
          lines: [...state.lines, { kind: "queue", text: `⏎ steer をキューに追加: ${text}` }],
          achieved: achieve(state, "steer"),
          restored: null,
        };
      }
      const result = interpretInput(state.term, text);
      const ids: MissionId[] = [];
      if (text.startsWith("/login")) ids.push("login");
      if (text.startsWith("/model") && text.trim() !== "/model") ids.push("model");
      if (text.startsWith("/session")) ids.push("session");
      if (text.startsWith("!!")) ids.push("bangbang");
      else if (text.startsWith("!")) ids.push("bang");
      if (result.run) ids.push("run");
      if (result.run && result.run.attachments.length > 0) ids.push("attach");
      return {
        ...state,
        term: result.state,
        lines: result.clear ? result.lines : [...state.lines, ...result.lines],
        run: result.run ? startRun(scriptForPrompt(result.run)) : null,
        achieved: achieve(state, ...ids),
        restored: null,
      };
    }
    case "follow-up": {
      const text = action.text.trim();
      if (!text || !state.run) return reducer(state, { type: "submit", text });
      return {
        ...state,
        followUp: [...state.followUp, text],
        lines: [...state.lines, { kind: "queue", text: `⌥⏎ follow-up をキューに追加: ${text}` }],
        achieved: achieve(state, "followup"),
        restored: null,
      };
    }
    case "abort": {
      if (!state.run) return state;
      const queued = [...state.steering, ...state.followUp];
      return {
        ...state,
        run: null,
        steering: [],
        followUp: [],
        lines: [
          ...state.lines,
          { kind: "error", text: "⎋ 中断しました" },
          ...(queued.length > 0
            ? [{ kind: "muted" as const, text: `キューの ${queued.length} 件をエディターに戻しました` }]
            : []),
        ],
        achieved: achieve(state, "abort"),
        restored: queued.length > 0 ? queued.join("\n") : null,
      };
    }
    case "tick": {
      if (!state.run) return state;
      const { steps, index } = state.run;
      const step = steps[index];
      let lines = [...state.lines, step];
      let steering = state.steering;
      let nextSteps = steps;

      // steering は現在のツール呼び出しが終わったあと、次の応答の前に取り込まれる
      if (step.kind === "tool" && steering.length > 0) {
        const [first, ...rest] = steering;
        steering = rest;
        lines = [...lines, { kind: "queue", text: `↳ steering を取り込み: ${first}` }];
        nextSteps = [
          ...steps.slice(0, index + 1),
          { kind: "tool", text: "read src/index.ts  # 指示に合わせて方針を変更" },
          ...steps.slice(index + 1),
        ];
      }

      if (index + 1 < nextSteps.length) {
        return { ...state, lines, steering, run: { steps: nextSteps, index: index + 1 } };
      }

      // 実行が終わろうとした時点で follow-up を取り込む
      if (state.followUp.length > 0) {
        const [first, ...rest] = state.followUp;
        return {
          ...state,
          lines: [
            ...lines,
            { kind: "queue", text: `↳ follow-up を開始: ${first}` },
            { kind: "user", text: first },
          ],
          steering,
          followUp: rest,
          run: startRun(scriptForPrompt({ prompt: first, attachments: [] })),
        };
      }
      return { ...state, lines, steering, run: null };
    }
  }
}

interface TerminalSimulatorProps {
  title?: string;
  missions: Mission[];
  hint?: string;
}

export function TerminalSimulator({
  title = "Pi ターミナル・シミュレーター",
  missions,
  hint,
}: TerminalSimulatorProps) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(0);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 行が増えるたびに最下部へスクロールする
  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.lines.length]);

  useEffect(() => {
    if (!state.run) return;
    const timer = window.setTimeout(() => dispatch({ type: "tick" }), 900);
    return () => window.clearTimeout(timer);
  }, [state.run]);

  useEffect(() => {
    if (state.restored !== null) setInput(state.restored);
  }, [state.restored]);

  const suggestions = buildSuggestions(input);

  const submit = (followUp: boolean) => {
    dispatch(followUp ? { type: "follow-up", text: input } : { type: "submit", text: input });
    setInput("");
    setSelected(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit(event.altKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      dispatch({ type: "abort" });
    } else if (event.key === "Tab" && suggestions.length > 0) {
      event.preventDefault();
      setInput(suggestions[selected % suggestions.length].value);
      setSelected(0);
    } else if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setSelected((s) => (s + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setSelected((s) => (s - 1 + suggestions.length) % suggestions.length);
    }
  };

  const doneCount = missions.filter((m) => state.achieved.includes(m.id)).length;

  return (
    <WidgetFrame
      title={title}
      description={
        hint ??
        "実際の Pi と同じ操作を、安全なシミュレーションで試せます。ミッションを順にこなしてみましょう。"
      }
      actions={
        <button
          type="button"
          className="btn small"
          onClick={() => {
            dispatch({ type: "reset" });
            setInput("");
          }}
        >
          リセット
        </button>
      }
    >
      <div className="widget-grid lead-left-strong">
        <div className="term">
          <div className="term-bar">
            <span className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            ~/project — pi
          </div>
          <div className="term-screen" ref={screenRef} aria-live="polite">
            {state.lines.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ログは追記のみ
              <div key={i} className={`term-line ${line.kind}`}>
                {line.kind === "tool" ? `⚙ ${line.text}` : line.text}
              </div>
            ))}
            {state.run && (
              <div className="term-spinner">⠋ 作業中…（Enter: steer / Alt+Enter: follow-up / Esc: 中断）</div>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="term-suggest" role="listbox" aria-label="補完候補">
              {suggestions.map((s, i) => (
                <button
                  key={s.value}
                  type="button"
                  role="option"
                  aria-selected={i === selected % suggestions.length}
                  onClick={() => {
                    setInput(s.value);
                    inputRef.current?.focus();
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="term-editor">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelected(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={state.run ? "作業中に指示を送る…" : "メッセージを入力（/ でコマンド）"}
              aria-label="Pi への入力"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="term-footer">
            <span>~/project</span>
            <span>{state.term.loggedIn ? state.term.model : "モデル未接続"}</span>
            <span>thinking: {state.term.thinking}</span>
            <span>context: {state.term.contextItems.length} 件</span>
            {(state.steering.length > 0 || state.followUp.length > 0) && (
              <span className="live">
                queue: steer {state.steering.length} / follow-up {state.followUp.length}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="panel-label">
            ミッション {doneCount}/{missions.length}
          </div>
          <ul className="mission-list">
            {missions.map((m) => {
              const done = state.achieved.includes(m.id);
              return (
                <li key={m.id} className={done ? "done" : ""}>
                  <span className={`check-dot ${done ? "done" : ""}`} aria-hidden="true">
                    {done ? "✓" : ""}
                  </span>
                  <span>{m.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn small"
              disabled={!input.trim()}
              onClick={() => submit(false)}
            >
              Enter
            </button>
            <button
              type="button"
              className="btn small"
              disabled={!input.trim() || !state.run}
              onClick={() => submit(true)}
            >
              Alt+Enter
            </button>
            <button
              type="button"
              className="btn small"
              disabled={!state.run}
              onClick={() => dispatch({ type: "abort" })}
            >
              Esc
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
            キーボードが使えない環境では上のボタンで代用できます。Tab で補完、↑↓ で候補を選択。
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}

function buildSuggestions(input: string): { value: string; label: string }[] {
  if (/^\/\S*$/.test(input)) {
    return SLASH_COMMANDS.filter((c) => c.name.startsWith(input)).map((c) => ({
      value: `${c.name} `,
      label: `${c.name.padEnd(10)} ${c.description}`,
    }));
  }
  const at = /@([\w./-]*)$/.exec(input);
  if (at) {
    return SAMPLE_FILES.filter((f) => f.startsWith(at[1])).map((f) => ({
      value: `${input.slice(0, at.index)}@${f} `,
      label: `@${f}`,
    }));
  }
  return [];
}
