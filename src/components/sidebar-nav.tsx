import { NavLink } from "react-router-dom";
import { lessonKey, pillars } from "../content/curriculum";
import { useProgress } from "../hooks/use-progress";

interface SidebarNavProps {
  open: boolean;
  onNavigate: () => void;
}

export function SidebarNav({ open, onNavigate }: SidebarNavProps) {
  const { isCompleted } = useProgress();

  return (
    <nav className={`sidebar ${open ? "open" : ""}`} aria-label="カリキュラム">
      {pillars.map((pillar) => (
        <div className="sidebar-section" data-pillar={pillar.id} key={pillar.id}>
          <NavLink to={`/${pillar.id}`} end className="sidebar-pillar" onClick={onNavigate}>
            <span className="num">{pillar.number}</span>
            {pillar.title}
          </NavLink>
          <ul className="sidebar-lessons">
            {pillar.lessons.map((lesson) => {
              const done = isCompleted(lessonKey(pillar.id, lesson.id));
              return (
                <li key={lesson.id}>
                  <NavLink
                    to={`/${pillar.id}/${lesson.id}`}
                    className={({ isActive }) => `sidebar-lesson ${isActive ? "active" : ""}`}
                    onClick={onNavigate}
                  >
                    <span
                      className={`check-dot ${done ? "done" : ""}`}
                      role="img"
                      aria-label={done ? "完了" : "未完了"}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span>{lesson.title}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
