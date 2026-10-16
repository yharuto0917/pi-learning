import { Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { QuizCard } from "../components/quiz-card";
import { findLesson, lessonKey } from "../content/curriculum";
import { useProgress } from "../hooks/use-progress";
import { lessonComponents } from "../lessons";
import { NotFoundPage } from "./not-found-page";

export function LessonPage() {
  const { pillarId, lessonId } = useParams();
  const location = findLesson(pillarId, lessonId);
  const { isCompleted, setCompleted } = useProgress();

  if (!location) return <NotFoundPage />;
  const { pillar, lesson, index, prev, next } = location;
  const key = lessonKey(pillar.id, lesson.id);
  const Body = lessonComponents[key];
  const done = isCompleted(key);

  return (
    <article className="content prose" data-pillar={pillar.id}>
      <div className="lesson-meta">
        <Link to={`/${pillar.id}`} className="eyebrow" style={{ textDecoration: "none" }}>
          {pillar.number} {pillar.title} · Lesson {index + 1}
        </Link>
      </div>
      <h1>{lesson.title}</h1>
      <p className="lead">{lesson.summary}</p>
      <div className="lesson-meta">
        <span className="chip">約 {lesson.minutes} 分</span>
        {done && <span className="chip pillar">✓ 完了</span>}
      </div>

      <section className="lesson-goals">
        <h2>このレッスンのゴール</h2>
        <ul>
          {lesson.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      {Body ? (
        <Suspense fallback={<p className="muted">読み込み中…</p>}>
          <Body />
        </Suspense>
      ) : (
        <p className="muted">このレッスンは準備中です。</p>
      )}

      <QuizCard key={key} questions={lesson.quiz} onPassed={() => setCompleted(key, true)} />

      <div className="btn-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <button type="button" className="btn small ghost" onClick={() => setCompleted(key, !done)}>
          {done ? "未完了に戻す" : "クイズなしで完了にする"}
        </button>
      </div>

      <section className="source-links">
        <strong>一次情報（公式ドキュメント・ソース）</strong>
        <ul>
          {lesson.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <nav className="lesson-nav" aria-label="前後のレッスン">
        {prev && (
          <Link to={`/${prev.pillar.id}/${prev.lesson.id}`}>
            <span className="dir">← 前のレッスン</span>
            {prev.lesson.title}
          </Link>
        )}
        {next && (
          <Link to={`/${next.pillar.id}/${next.lesson.id}`} className="next">
            <span className="dir">次のレッスン →</span>
            {next.lesson.title}
          </Link>
        )}
      </nav>
    </article>
  );
}
