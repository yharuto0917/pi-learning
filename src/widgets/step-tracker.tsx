import { type ReactNode, useState } from "react";
import { WidgetFrame } from "../components/widget-frame";

export interface TrackedStep {
  title: string;
  body: ReactNode;
}

interface StepTrackerProps {
  title: string;
  description: string;
  steps: TrackedStep[];
}

export function StepTracker({ title, description, steps }: StepTrackerProps) {
  const [open, setOpen] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  const complete = (index: number) => {
    setDone((d) => new Set(d).add(index));
    setOpen(index + 1 < steps.length ? index + 1 : -1);
  };

  return (
    <WidgetFrame
      title={title}
      description={description}
      actions={
        <span className="chip pillar">
          {done.size}/{steps.length} ステップ
        </span>
      }
    >
      <div className="bar" style={{ marginBottom: 14 }}>
        <span style={{ width: `${(done.size / steps.length) * 100}%` }} />
      </div>
      <ol className="step-list">
        {steps.map((step, i) => (
          <li key={step.title} className={`step ${done.has(i) ? "done" : ""}`}>
            <button
              type="button"
              className="step-head"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <span className="step-num">{done.has(i) ? "✓" : i + 1}</span>
              <span style={{ flex: 1 }}>{step.title}</span>
              <span className="muted" aria-hidden="true">
                {open === i ? "▾" : "▸"}
              </span>
            </button>
            {open === i && (
              <div className="step-body">
                {step.body}
                <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="btn primary small" onClick={() => complete(i)}>
                    {i + 1 < steps.length ? "できた → 次へ" : "完成！"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {done.size === steps.length && (
        <div className="status-banner ok" style={{ marginTop: 14 }}>
          🎉 すべてのステップを完了しました。最後に下の「設計の振り返り」を読んでおきましょう。
        </div>
      )}
    </WidgetFrame>
  );
}
