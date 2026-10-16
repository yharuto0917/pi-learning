import { Link, useParams } from "react-router-dom";
import { findPillar, lessonKey } from "../content/curriculum";
import { useProgress } from "../hooks/use-progress";
import { NotFoundPage } from "./not-found-page";

export function PillarPage() {
  const { pillarId } = useParams();
  const pillar = findPillar(pillarId);
  const { isCompleted } = useProgress();
  if (!pillar) return <NotFoundPage />;

  const done = pillar.lessons.filter((l) => isCompleted(lessonKey(pillar.id, l.id))).length;
  const minutes = pillar.lessons.reduce((sum, l) => sum + l.minutes, 0);
  const first = pillar.lessons.find((l) => !isCompleted(lessonKey(pillar.id, l.id))) ?? pillar.lessons[0];

  return (
    <div className="content" data-pillar={pillar.id}>
      <section className="pillar-intro">
        <span className="eyebrow">Pillar {pillar.number}</span>
        <h1>{pillar.title}</h1>
        <p className="lead">{pillar.description}</p>
        <div className="lesson-meta" style={{ marginTop: 12 }}>
          <span className="chip">{pillar.lessons.length} レッスン</span>
          <span className="chip">合計 約 {minutes} 分</span>
          <span className="chip pillar">
            {done}/{pillar.lessons.length} 完了
          </span>
        </div>
        <div className="bar" style={{ margin: "14px 0 18px" }}>
          <span style={{ width: `${(done / pillar.lessons.length) * 100}%` }} />
        </div>
        <Link to={`/${pillar.id}/${first.id}`} className="btn primary">
          {done === 0
            ? "最初のレッスンから始める"
            : done === pillar.lessons.length
              ? "復習する"
              : "続きから学ぶ"}{" "}
          →
        </Link>
      </section>

      <ol className="lesson-cards">
        {pillar.lessons.map((lesson, i) => {
          const complete = isCompleted(lessonKey(pillar.id, lesson.id));
          return (
            <li key={lesson.id}>
              <Link to={`/${pillar.id}/${lesson.id}`} className="lesson-card">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1 }}>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.summary}</p>
                </div>
                <span
                  className={`check-dot ${complete ? "done" : ""}`}
                  role="img"
                  aria-label={complete ? "完了" : "未完了"}
                >
                  {complete ? "✓" : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
