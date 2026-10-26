import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="wab-pageheader">
      <div className="wab-pageheader__text">
        <h1 className="wab-pageheader__title">{title}</h1>
        {subtitle ? <p className="wab-pageheader__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="wab-pageheader__actions">{actions}</div> : null}
    </header>
  );
}
