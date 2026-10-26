import type { ReactNode } from 'react';

/** Design `head` block: serif title with optional badges (live pill, status), subtitle, actions at the end. */
export function PageHeader({
  title,
  subtitle,
  actions,
  badges,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Shown next to the title (e.g. the realtime "Live" pill). */
  badges?: ReactNode;
}) {
  return (
    <header className="wab-pageheader">
      <div className="wab-pageheader__text">
        <div className="wab-pageheader__titlerow">
          <h1 className="wab-pageheader__title">{title}</h1>
          {badges}
        </div>
        {subtitle ? <p className="wab-pageheader__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="wab-pageheader__actions">{actions}</div> : null}
    </header>
  );
}
