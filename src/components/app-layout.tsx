import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { totalLessons } from "../content/curriculum";
import { useProgress } from "../hooks/use-progress";
import { useTheme } from "../hooks/use-theme";
import { SidebarNav } from "./sidebar-nav";

const THEME_LABEL = { system: "システム", light: "ライト", dark: "ダーク" } as const;
const THEME_ICON = { system: "◐", light: "☀", dark: "☾" } as const;

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { completed } = useProgress();
  const { mode, cycle } = useTheme();
  const location = useLocation();
  const percent = Math.round((completed.size / totalLessons) * 100);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ページ遷移のたびに先頭へ戻す
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      <header className="app-header">
        <button
          type="button"
          className="icon-button menu-button"
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        <Link to="/" className="brand">
          <span className="brand-mark">π</span>
          Pi Learning Lab
          <small>for pi.dev</small>
        </Link>
        <div className="header-spacer" />
        <div className="header-progress" title="完了したレッスン">
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span>
            {completed.size}/{totalLessons}
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={cycle}
          aria-label={`テーマ: ${THEME_LABEL[mode]}（クリックで切り替え）`}
          title={`テーマ: ${THEME_LABEL[mode]}`}
        >
          {THEME_ICON[mode]}
        </button>
      </header>
      <div className="app-body">
        <SidebarNav open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <button
          type="button"
          aria-label="メニューを閉じる"
          className={`sidebar-backdrop ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(false)}
          tabIndex={-1}
          style={{ border: "none", padding: 0 }}
        />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
