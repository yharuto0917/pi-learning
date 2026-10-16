import { type KeyboardEvent, useEffect, useReducer, useRef, useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import { initialSimState, type Mission, simReducer } from "../lib/terminal-session";
import { SAMPLE_FILES, SLASH_COMMANDS } from "../lib/terminal-sim";

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
  const [state, dispatch] = useReducer(simReducer, undefined, initialSimState);
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
