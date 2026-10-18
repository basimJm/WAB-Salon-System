import type { ToneName } from '@/design/tokens/colors';
import { formatInstant } from '@/domain/shared/format';
import { useLanguage } from '../../hooks/useLanguage';
import { cx } from '../../utils/cx';

export interface TimelineEntry {
  id: string;
  title: string;
  /** Who did it ("Customer", "Salon: Layla", "System", an admin name). */
  actor?: string;
  /** ISO instant (UTC). */
  at: string;
  /** Why (status changes always carry a reason, BUSINESS_DOMAIN §5). */
  reason?: string;
  tone?: ToneName;
}

export interface TimelineProps {
  entries: readonly TimelineEntry[];
  ariaLabel: string;
  /** Text when there is nothing yet. */
  empty: string;
}

/** Status history: one row per change, in the order given, times in Asia/Amman with language digits. */
export function Timeline({ entries, ariaLabel, empty }: TimelineProps) {
  const { language } = useLanguage();
  if (entries.length === 0) return <p className="wab-timeline__empty">{empty}</p>;
  return (
    <ol className="wab-timeline" aria-label={ariaLabel}>
      {entries.map((entry) => (
        <li key={entry.id} className="wab-timeline__item">
          <span
            className={cx('wab-timeline__dot', `wab-timeline__dot--${entry.tone ?? 'grey'}`)}
            aria-hidden="true"
          />
          <div className="wab-timeline__body">
            <p className="wab-timeline__title">{entry.title}</p>
            <p className="wab-timeline__meta">
              {entry.actor ? `${entry.actor} · ` : ''}
              <time dateTime={entry.at}>{formatInstant(entry.at, language)}</time>
            </p>
            {entry.reason ? <p className="wab-timeline__reason">{entry.reason}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
