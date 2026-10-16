import { useState } from "react";
import { Link } from "react-router-dom";
import { WidgetFrame } from "../components/widget-frame";
import { mechanisms, walkChooser } from "../lib/mechanism-chooser";

export function MechanismChooser() {
  const [answers, setAnswers] = useState<boolean[]>([]);
  const node = walkChooser(answers);

  const trail = answers.map((answer, i) => {
    const asked = walkChooser(answers.slice(0, i));
    return { text: asked.kind === "question" ? asked.text : "", answer };
  });

  return (
    <WidgetFrame
      title="カスタマイズ・チューザー"
      description="はい／いいえで答えると、要件を満たす最も小さな仕組みにたどり着きます。"
      actions={
        <button
          type="button"
          className="btn small"
          onClick={() => setAnswers([])}
          disabled={answers.length === 0}
        >
          最初から
        </button>
      }
    >
      {trail.length > 0 && (
        <div className="crumbs">
          {trail.map((t, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: 回答履歴は順序固定
              key={i}
              type="button"
              className="chip"
              style={{ cursor: "pointer" }}
              title="この質問からやり直す"
              onClick={() => setAnswers(answers.slice(0, i))}
            >
              {t.answer ? "はい" : "いいえ"}: {t.text.slice(0, 18)}…
            </button>
          ))}
        </div>
      )}
      {node.kind === "question" ? (
        <div>
          <p className="chooser-q">{node.text}</p>
          {node.hint && (
            <p className="muted" style={{ fontSize: 14 }}>
              {node.hint}
            </p>
          )}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn primary" onClick={() => setAnswers([...answers, true])}>
              はい
            </button>
            <button type="button" className="btn" onClick={() => setAnswers([...answers, false])}>
              いいえ
            </button>
          </div>
        </div>
      ) : (
        <div className="outcome">
          <span className="eyebrow">おすすめ</span>
          <h4>{mechanisms[node.mechanism].title}</h4>
          <p style={{ margin: "4px 0 8px" }}>{mechanisms[node.mechanism].summary}</p>
          <p className="mono" style={{ fontSize: 13, margin: "0 0 10px" }}>
            {mechanisms[node.mechanism].where}
          </p>
          <div className="btn-row">
            <Link to={`/customize/${mechanisms[node.mechanism].lessonId}`} className="btn small">
              関連レッスンへ →
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>
            ほかの人にも配りたくなったら、これらを <strong>Pi パッケージ</strong>にまとめて npm や git
            で共有できます。
          </p>
        </div>
      )}
    </WidgetFrame>
  );
}
