import { useEffect, useRef, useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import { completeRun, createRpcState, type RpcRecord, type RpcState, sendRpcLine } from "../lib/rpc-sim";

const PRESETS = [
  { label: "prompt", line: '{"id":"req-1","type":"prompt","message":"このリポジトリをレビューして"}' },
  { label: "prompt（実行中）", line: '{"id":"req-2","type":"prompt","message":"テストも見て"}' },
  { label: "steer", line: '{"id":"req-3","type":"steer","message":"セキュリティを優先して"}' },
  { label: "follow_up", line: '{"id":"req-4","type":"follow_up","message":"最後に要約して"}' },
  { label: "get_state", line: '{"id":"req-5","type":"get_state"}' },
  { label: "set_session_name", line: '{"type":"set_session_name","name":"review-run"}' },
  { label: "abort", line: '{"id":"req-6","type":"abort"}' },
  { label: "壊れた JSON", line: '{"type": "prompt", ' },
];

function recordClass(record: RpcRecord): string {
  if (record.direction === "in") return "in";
  const type = record.json.type;
  if (type === "response") return record.json.success === false ? "response failed" : "response";
  if (type === "agent_settled") return "settled";
  return "event";
}

export function RpcPlayground() {
  const [state, setState] = useState<RpcState>(createRpcState);
  const [records, setRecords] = useState<RpcRecord[]>([]);
  const [line, setLine] = useState(PRESETS[0].line);
  const [filterEvents, setFilterEvents] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: レコードが増えたら最下部へ
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [records.length]);

  const send = (text: string) => {
    const result = sendRpcLine(state, text);
    // 入力した行そのものも表示する（壊れた JSON でも）
    const echoed: RpcRecord[] = result.records.some((r) => r.direction === "in")
      ? result.records
      : [{ direction: "in", json: { raw: text } }, ...result.records];
    setState(result.state);
    setRecords((r) => [...r, ...echoed]);
  };

  const finish = () => {
    const result = completeRun(state);
    setState(result.state);
    setRecords((r) => [...r, ...result.records]);
  };

  const shown = filterEvents
    ? records.filter((r) => r.direction === "in" || r.json.type === "response")
    : records;

  return (
    <WidgetFrame
      title="RPC プレイグラウンド"
      description="pi --mode rpc の stdin に JSONL を送り、stdout の応答とイベントを観察します（学習用に単純化したシミュレーション）。"
      actions={
        <button
          type="button"
          className="btn small"
          onClick={() => {
            setState(createRpcState());
            setRecords([]);
          }}
        >
          リセット
        </button>
      }
    >
      <div className="widget-grid lead-left-strong">
        <div style={{ minWidth: 0 }}>
          <div className="rpc-log" ref={logRef} aria-live="polite">
            {shown.length === 0 && (
              <div style={{ color: "var(--term-muted)" }}>$ pi --mode rpc --no-session</div>
            )}
            {shown.map((r, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ログは追記のみ
              <div key={i} className={`rpc-rec ${recordClass(r)}`}>
                <span className="rpc-dir">{r.direction === "in" ? "stdin →" : "← stdout"}</span>
                <span className="rpc-json">
                  {"raw" in r.json ? String(r.json.raw) : JSON.stringify(r.json)}
                </span>
              </div>
            ))}
          </div>
          <form
            className="rpc-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(line);
            }}
          >
            <input
              className="input"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              aria-label="送信する JSONL"
              spellCheck={false}
            />
            <button type="submit" className="btn primary">
              送信
            </button>
          </form>
        </div>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div>
            <div className="panel-label">コマンド例</div>
            <div className="example-row" style={{ marginTop: 0 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn small"
                  onClick={() => send(p.line)}
                  title={p.line}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn" disabled={!state.isStreaming} onClick={finish}>
            ▶ 実行を最後まで進める
          </button>
          <div className="detail-card">
            <div>
              isStreaming: <strong>{String(state.isStreaming)}</strong>
            </div>
            <div>
              steering キュー: {state.steering.length} / follow-up キュー: {state.followUp.length}
            </div>
            <div>thinkingLevel: {state.thinkingLevel}</div>
            {state.sessionName && <div>sessionName: {state.sessionName}</div>}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={filterEvents}
              onChange={(e) => setFilterEvents(e.target.checked)}
            />
            イベントを隠して、コマンドと応答の対応だけを見る
          </label>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            応答は <code>id</code> で対応付けます。
            <span style={{ color: "var(--harness)" }}>agent_settled</span> が来るまで、Pi
            はリトライやキュー処理で続行する可能性があります。
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}
