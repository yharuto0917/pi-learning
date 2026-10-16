import { Link } from "react-router-dom";
import { lessonKey, PI_VERSION, pillars } from "../content/curriculum";
import { useProgress } from "../hooks/use-progress";

export function HomePage() {
  const { isCompleted, completed, reset } = useProgress();

  return (
    <div className="content-wide">
      <section className="hero">
        <span className="eyebrow">Interactive course · Pi {PI_VERSION}</span>
        <h1>Pi を、自分のものにする。</h1>
        <p className="lead" style={{ maxWidth: 720 }}>
          <a href="https://pi.dev" target="_blank" rel="noreferrer">
            Pi
          </a>{" "}
          は「自分のものにできる」最小限のエージェントハーネスです。この学習サイトでは、ターミナルのシミュレーターやコードビルダーを触りながら、
          基本操作 → CLI のカスタマイズ → Pi の部品で独自ハーネスを組む、の 3 段階で理解を深めます。
        </p>
        <div className="btn-row" data-pillar="basics" style={{ marginTop: 18 }}>
          <Link to="/basics/what-is-pi" className="btn primary">
            はじめから学ぶ →
          </Link>
          <Link to="/basics/interactive" className="btn">
            ターミナルを試す
          </Link>
        </div>
      </section>

      <div className="pillar-grid">
        {pillars.map((pillar) => {
          const done = pillar.lessons.filter((l) => isCompleted(lessonKey(pillar.id, l.id))).length;
          return (
            <Link key={pillar.id} to={`/${pillar.id}`} className="card pillar-card" data-pillar={pillar.id}>
              <span className="eyebrow">Pillar {pillar.number}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.tagline}</p>
              <ul>
                {pillar.lessons.map((lesson) => (
                  <li key={lesson.id}>{lesson.title}</li>
                ))}
              </ul>
              <div className="bar" role="img" aria-label={`${done}/${pillar.lessons.length} 完了`}>
                <span style={{ width: `${(done / pillar.lessons.length) * 100}%` }} />
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                {done}/{pillar.lessons.length} レッスン完了
              </span>
            </Link>
          );
        })}
      </div>

      <section className="content" style={{ margin: 0, maxWidth: 820 }}>
        <h2>このサイトの使い方</h2>
        <ol className="path-steps">
          <li>
            <span>
              各レッスンには <strong>interactive</strong>{" "}
              と書かれた教材があります。ターミナルのシミュレーターやコード生成器を実際に操作してください。
            </span>
          </li>
          <li>
            <span>
              レッスンの最後のクイズで 7 割以上正解すると完了になります。進捗はこのブラウザーに保存されます。
            </span>
          </li>
          <li>
            <span>
              各レッスンの末尾に、根拠にした公式ドキュメントとソースへのリンクがあります。最新の仕様は必ずそちらで確認してください。
            </span>
          </li>
        </ol>
        {completed.size > 0 && (
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn small ghost" onClick={reset}>
              進捗をリセット
            </button>
          </div>
        )}
        <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>
          本サイトは Pi（MIT License, Earendil
          Inc.）の公式ドキュメントとソースコードをもとに作成した非公式の学習教材です。
          シミュレーターは学習用に挙動を単純化しています。
        </p>
      </section>
    </div>
  );
}
