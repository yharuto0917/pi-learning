import { useEffect, useState } from "react";
import { SegmentedControl } from "../components/segmented-control";
import { WidgetFrame } from "../components/widget-frame";
import {
  defaultScenario,
  type FinishTurnMode,
  type LoopScenario,
  simulateAgentLoop,
} from "../lib/agent-events";

interface AgentLoopSimulatorProps {
  variant: "basic" | "advanced";
}

export function AgentLoopSimulator({ variant }: AgentLoopSimulatorProps) {
  const advanced = variant === "advanced";
  const [scenario, setScenario] = useState<LoopScenario>({ ...defaultScenario, toolCalls: advanced ? 2 : 1 });
  const [showHooks, setShowHooks] = useState(advanced);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const events = simulateAgentLoop(scenario).filter((e) => showHooks || e.kind !== "hook");
  const visible = Math.min(step, events.length);

  useEffect(() => {
    if (!playing) return;
    if (visible >= events.length) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s + 1), 450);
    return () => window.clearTimeout(timer);
  }, [playing, visible, events.length]);

  const update = (patch: Partial<LoopScenario>) => {
    setScenario((s) => ({ ...s, ...patch }));
    setStep(0);
    setPlaying(false);
  };

  const turns = events.filter((e) => e.type === "turn_start").length;
  const current = events[visible - 1];

  return (
    <WidgetFrame
      title={
        advanced ? "エージェントループ・イベントシミュレーター" : "エージェントループを 1 ステップずつ見る"
      }
      description={
        advanced
          ? "pi-agent-core の agentLoop と同じ制御で、イベントとフックの発生順を組み立てます。条件を変えて違いを観察しましょう。"
          : "依頼の種類を選び「再生」してください。ツールを使うと、結果を受けてもう 1 ターン回ることがわかります。"
      }
    >
      <div className="widget-grid">
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div>
            <div className="panel-label">アシスタントのツール呼び出し数</div>
            <SegmentedControl
              label="ツール呼び出し数"
              value={String(scenario.toolCalls)}
              options={(advanced ? ["0", "1", "2", "3"] : ["0", "1", "2"]).map((v) => ({
                value: v,
                label: v === "0" ? "なし" : `${v} 個`,
              }))}
              onChange={(v) => update({ toolCalls: Number(v) })}
            />
          </div>
          {advanced && (
            <>
              <div>
                <div className="panel-label">toolExecution</div>
                <SegmentedControl
                  label="ツール実行モード"
                  value={scenario.toolExecution}
                  options={[
                    { value: "parallel", label: "parallel（既定）" },
                    { value: "sequential", label: "sequential" },
                  ]}
                  onChange={(v) => update({ toolExecution: v })}
                />
              </div>
              <div>
                <div className="panel-label">finishTurn</div>
                <SegmentedControl<FinishTurnMode>
                  label="finishTurn"
                  value={scenario.finishTurn}
                  options={[
                    { value: "none", label: "undefined" },
                    { value: "end", label: "end" },
                    { value: "continue-once", label: "continue（1 回）" },
                  ]}
                  onChange={(v) => update({ finishTurn: v })}
                />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={scenario.blockFirstTool}
                  onChange={(e) => update({ blockFirstTool: e.target.checked })}
                />
                beforeToolCall で 1 つ目のツールをブロック
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={scenario.terminateAll}
                  onChange={(e) => update({ terminateAll: e.target.checked })}
                />
                すべてのツールが terminate: true を返す
              </label>
            </>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={scenario.steering}
              onChange={(e) => update({ steering: e.target.checked })}
            />
            実行中に steer（Enter）でメッセージを送る
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={scenario.followUp}
              onChange={(e) => update({ followUp: e.target.checked })}
            />
            実行中に follow-up（Alt+Enter）でメッセージを送る
          </label>
          {!advanced && (
            <label className="check">
              <input type="checkbox" checked={showHooks} onChange={(e) => setShowHooks(e.target.checked)} />
              内部のフック呼び出しも表示する
            </label>
          )}
          <div className="detail-card">
            <strong>
              {turns} ターン / {events.filter((e) => e.kind !== "hook").length} イベント
            </strong>
            <br />
            {current ? (
              <>
                <span className="mono">{current.type}</span> — {current.label}
                {current.note && <div className="muted">{current.note}</div>}
              </>
            ) : (
              <span className="muted">「再生」か「次へ」で進めます。</span>
            )}
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn primary small"
              onClick={() => {
                if (visible >= events.length) setStep(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? "一時停止" : visible >= events.length ? "最初から再生" : "再生"}
            </button>
            <button
              type="button"
              className="btn small"
              disabled={visible >= events.length}
              onClick={() => setStep((s) => s + 1)}
            >
              次へ
            </button>
            <button type="button" className="btn small" onClick={() => setStep(events.length)}>
              すべて表示
            </button>
          </div>
        </div>
        <div>
          <ol className="event-list" aria-label="イベント列">
            {events.map((e, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: イベント列はシナリオから決定的に生成される
                key={i}
                className={`event-item kind-${e.kind} ${i < visible ? "visible" : ""} ${i === visible - 1 ? "current" : ""}`}
                style={{ paddingLeft: 10 + e.depth * 14 }}
              >
                <span className="event-type">{e.type}</span>
                <span className="event-label">{e.label}</span>
              </li>
            ))}
          </ol>
          <div className="legend">
            <span className="l-agent">agent</span>
            <span className="l-turn">turn</span>
            <span className="l-message">message</span>
            <span className="l-tool">tool</span>
            <span className="l-hook">hook</span>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
