import type { ReactNode } from "react";

interface WidgetFrameProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function WidgetFrame({ title, description, actions, children }: WidgetFrameProps) {
  return (
    <section className="widget" aria-label={title}>
      <div className="widget-head">
        <div>
          <h3 className="widget-title">
            {title}
            <span className="widget-badge">interactive</span>
          </h3>
          {description && <p className="widget-desc">{description}</p>}
        </div>
        {actions && <div className="btn-row">{actions}</div>}
      </div>
      <div className="widget-body">{children}</div>
    </section>
  );
}
