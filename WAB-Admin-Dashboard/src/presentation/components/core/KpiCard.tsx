import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Card } from './Card';
import { Skeleton } from '../feedback/Skeleton';

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Change vs the previous period, in percent; sign decides the color/arrow. */
  deltaPercent?: number;
  deltaLabel?: string;
  loading?: boolean;
}

const ARROW_UP = '↑';
const ARROW_DOWN = '↓';

export function KpiCard({ label, value, deltaPercent, deltaLabel, loading = false }: KpiCardProps) {
  const positive = deltaPercent !== undefined && deltaPercent >= 0;
  return (
    <Card className="wab-kpi">
      <span className="wab-kpi__label">{label}</span>
      {loading ? <Skeleton height="lg" /> : <span className="wab-kpi__value">{value}</span>}
      {!loading && deltaPercent !== undefined ? (
        <span
          className={cx('wab-kpi__delta', positive ? 'wab-kpi__delta--up' : 'wab-kpi__delta--down')}
        >
          <span className="wab-kpi__chip" dir="ltr">
            <span aria-hidden="true">{positive ? ARROW_UP : ARROW_DOWN}</span>
            <span>{Math.abs(deltaPercent)}%</span>
          </span>
          {deltaLabel ? <span className="wab-kpi__delta-label">{deltaLabel}</span> : null}
        </span>
      ) : null}
    </Card>
  );
}
