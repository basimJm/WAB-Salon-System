import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnVisibility } from '../../hooks/useColumnVisibility';
import { usePopoverAlign } from '../../hooks/usePopoverAlign';
import { Button } from '../core/Button';
import { Toggle } from '../form/Toggle';

export interface ColumnPickerProps {
  columns: readonly { key: string; header: string }[];
  visibility: ColumnVisibility;
}

/** "Columns" button with a checkbox list. The last visible column stays checked and disabled. */
export function ColumnPicker({ columns, visibility }: ColumnPickerProps) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const panelRef = usePopoverAlign(open);
  const shown = columns.filter((c) => !visibility.hidden.has(c.key));
  return (
    <div
      role="presentation"
      className="wab-popover"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {t('table.columns')}
      </Button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={t('table.columns')}
          className="wab-popover__panel"
        >
          {columns.map((c) => {
            const isShown = !visibility.hidden.has(c.key);
            return (
              <Toggle
                key={c.key}
                label={c.header}
                checked={isShown}
                disabled={isShown && shown.length === 1}
                onChange={() => visibility.toggle(c.key)}
              />
            );
          })}
          <Button variant="ghost" size="sm" onClick={visibility.reset}>
            {t('table.resetColumns')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
