import { useEffect, useState } from "react";
import { WidgetFrame } from "../components/widget-frame";

type StreamEvent =
  | { type: "start" }
  | { type: "thinking_start" | "text_start" | "toolcall_start"; contentIndex: number; toolName?: string }
  | { type: "thinking_delta" | "text_delta" | "toolcall_delta"; contentIndex: number; delta: string }
  | { type: "thinking_end" | "text_end" | "toolcall_end"; contentIndex: number }
  | { type: "done"; reason: "stop" | "toolUse" | "length" };

// テキストとツール呼び出しが交互に届く（インターリーブする）例
const EVENTS: StreamEvent[] = [
  { type: "start" },
  { type: "thinking_start", contentIndex: 0 },
  { type: "thinking_delta", contentIndex: 0, delta: "設定を確認する" },
  { type: "thinking_delta", contentIndex: 0, delta: "必要がある。" },
  { type: "thinking_end", contentIndex: 0 },
  { type: "text_start", contentIndex: 1 },
  { type: "text_delta", contentIndex: 1, delta: "package.json を" },
  { type: "toolcall_start", contentIndex: 2, toolName: "read_file" },
  { type: "text_delta", contentIndex: 1, delta: "読んで確認します。" },
  { type: "toolcall_delta", contentIndex: 2, delta: '{"path":' },
  { type: "toolcall_delta", contentIndex: 2, delta: ' "package.json"}' },
  { type: "text_end", contentIndex: 1 },
  { type: "toolcall_end", contentIndex: 2 },
  { type: "done", reason: "toolUse" },
];

interface Block {
  kind: "thinking" | "text" | "toolCall";
  content: string;
  name?: string;
  closed: boolean;
}

function reconstruct(events: StreamEvent[]): { blocks: Block[]; done?: string } {
  const blocks: Block[] = [];
  let done: string | undefined;
  for (const e of events) {
    if (e.type === "start") continue;
    if (e.type === "done") {
      done = e.reason;
      continue;
    }
    const kind = e.type.startsWith("thinking") ? "thinking" : e.type.startsWith("text") ? "text" : "toolCall";
    if (e.type.endsWith("_start")) {
      blocks[e.contentIndex] = {
        kind,
        content: "",
        closed: false,
        name: "toolName" in e ? e.toolName : undefined,
      };
    } else if ("delta" in e) {
      blocks[e.contentIndex] = {
        ...blocks[e.contentIndex],
        content: blocks[e.contentIndex].content + e.delta,
      };
    } else {
      blocks[e.contentIndex] = { ...blocks[e.contentIndex], closed: true };
    }
  }
  return { blocks, done };
}

function describe(e: StreamEvent): string {
  const parts: string[] = [];
  if ("contentIndex" in e) parts.push(`contentIndex: ${e.contentIndex}`);
  if ("delta" in e) parts.push(`delta: ${JSON.stringify(e.delta)}`);
  if ("toolName" in e && e.toolName) parts.push(`toolName: "${e.toolName}"`);
  if (e.type === "done") parts.push(`reason: "${e.reason}"`);
  return parts.join(", ");
}

export function StreamReplay() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { blocks, done } = reconstruct(EVENTS.slice(0, step));

  useEffect(() => {
    if (!playing) return;
    if (step >= EVENTS.length) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), 500);
    return () => window.clearTimeout(timer);
  }, [playing, step]);

  return (
    <WidgetFrame
      title="ストリーミングイベント・リプレイ"
      description="models.stream() が返すイベントを 1 つずつ適用し、contentIndex ごとにメッセージを組み立てます。テキストとツール呼び出しが交互に届く点に注目。"
      actions={
        <>
          <button
            type="button"
            className="btn primary small"
            onClick={() => {
              if (step >= EVENTS.length) setStep(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "一時停止" : step >= EVENTS.length ? "最初から" : "再生"}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={step >= EVENTS.length}
            onClick={() => setStep((s) => s + 1)}
          >
            次へ
          </button>
        </>
      }
    >
      <div className="widget-grid">
        <ol className="event-list" aria-label="ストリーミングイベント">
          {EVENTS.map((e, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: 固定の台本
              key={i}
              className={`event-item ${e.type.startsWith("toolcall") ? "kind-tool" : e.type.startsWith("text") ? "kind-message" : e.type.startsWith("thinking") ? "kind-hook" : "kind-agent"} ${i < step ? "visible" : ""} ${i === step - 1 ? "current" : ""}`}
            >
              <span className="event-type">{e.type}</span>
              <span className="event-note">{describe(e)}</span>
            </li>
          ))}
        </ol>
        <div>
          <div className="panel-label">組み立て中の AssistantMessage.content</div>
          <ul className="context-list">
            {blocks.length === 0 && <li className="muted">（start を待っています）</li>}
            {blocks.map((b, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: contentIndex がキー
                key={i}
                style={{
                  borderLeftColor:
                    b.kind === "toolCall"
                      ? "var(--harness)"
                      : b.kind === "text"
                        ? "var(--basics)"
                        : "var(--ok)",
                }}
              >
                <span className="mono" style={{ fontSize: 11 }}>
                  [{i}] {b.kind}
                  {b.name ? ` ${b.name}` : ""} {b.closed ? "✓" : "…"}
                </span>
                <div className={b.kind === "toolCall" ? "mono" : ""} style={{ fontSize: 13 }}>
                  {b.content || <span className="muted">（空）</span>}
                </div>
              </li>
            ))}
          </ul>
          {done && (
            <div className="status-banner ok" style={{ marginTop: 10 }}>
              done — stopReason: {done}（ツールを実行して結果を context に積む番）
            </div>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
