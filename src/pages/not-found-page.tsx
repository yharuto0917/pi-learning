import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="content not-found">
      <p className="eyebrow">404</p>
      <h1>ページが見つかりません</h1>
      <p className="muted">URL が変わったか、まだ存在しないレッスンです。</p>
      <Link to="/" className="btn">
        トップへ戻る
      </Link>
    </div>
  );
}
