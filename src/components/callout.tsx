import type { ReactNode } from "react";

type CalloutKind = "tip" | "warn" | "note";

const ICONS: Record<CalloutKind, string> = { tip: "✓", warn: "!", note: "i" };

interface CalloutProps {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
}

export function Callout({ kind = "note", title, children }: CalloutProps) {
  return (
    <aside className={`callout ${kind}`}>
      <span className="callout-icon" aria-hidden="true">
        {ICONS[kind]}
      </span>
      <div>
        {title && <div className="callout-title">{title}</div>}
        {children}
      </div>
    </aside>
  );
}
