import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ANALYTICS_BOARDS, tabletSpan, type BoardId } from '@/constants/analytics';
import { NAV_PAGES } from '@/constants/nav';
import { KpiCard } from '../components/core/KpiCard';
import { PageHeader } from '../components/core/PageHeader';
import { SectionCard } from '../components/core/SectionCard';
import { FilterBar } from '../components/data/FilterBar';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LiveIndicator } from '../components/feedback/LiveIndicator';
import { useLazyStrings } from '../hooks/useLazyStrings';

/** A KPI the server has a number for. */
export interface BoardKpi {
  value: string;
  note?: string;
  tone?: 'rose';
  deltaPercent?: number;
  deltaLabel?: string;
}

export interface AnalyticsBoardProps {
  board: BoardId;
  /** Nav path of the page (title = its nav label). */
  path: string;
  /** Range filter; omitted on boards with no server data (a filter that filters nothing would mislead). */
  filters?: ReactNode;
  kpis?: Readonly<Record<string, BoardKpi>>;
  /** Values for placeholders in KPI labels (e.g. `{{days}}`), by KPI id. */
  kpiParams?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Charts with their own titled frame (`ChartFrame`), by card id. */
  charts?: Readonly<Record<string, ReactNode>>;
  /** Bodies drawn inside the design card with the card's title, by card id. */
  panels?: Readonly<Record<string, ReactNode>>;
  /** Header actions of a card by id (e.g. "Open transactions" on a card the server has no rows for). */
  cardActions?: Readonly<Record<string, ReactNode>>;
  loading?: boolean;
  /** The KPI source failed: an error with retry replaces the KPI row. */
  error?: unknown;
  onRetry?: () => void;
}

/** Design "no data yet" body: the server does not send this metric yet (gap rows in the server backlog). */
export function NoData() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="chart"
      title={t('analytics.noData')}
      description={t('analytics.noDataText')}
    />
  );
}

/**
 * One analytics page laid out as its design board (A02-A10): header (+ live pill), range filter, KPI row, then
 * the cards on a 12-column grid. KPIs and cards without server data show "no data yet", never a made-up number.
 */
export function AnalyticsBoard({
  board,
  path,
  filters,
  kpis = {},
  kpiParams = {},
  charts = {},
  panels = {},
  cardActions = {},
  loading = false,
  error,
  onRetry,
}: AnalyticsBoardProps) {
  useLazyStrings('analytics');
  const { t } = useTranslation();
  const def = ANALYTICS_BOARDS[board];
  const nav = NAV_PAGES.find((n) => n.path === path);
  const live = 'live' in def && def.live;
  return (
    <div className="wab-page wab-stack">
      <PageHeader
        title={nav ? t(nav.labelKey) : t('nav.analytics')}
        subtitle={t(`${def.ns}.${board}.sub`)}
        badges={live ? <LiveIndicator /> : undefined}
      />
      {filters ? <FilterBar>{filters}</FilterBar> : null}
      {error !== undefined && error !== null ? (
        <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />
      ) : (
        <section className="wab-kpi-row" aria-label={t('analytics.kpis')}>
          {def.kpis.map((id) => {
            const kpi = kpis[id];
            const label = t(`${def.ns}.${board}.kpi.${id}`, kpiParams[id] ?? {});
            return kpi ? (
              <KpiCard
                key={id}
                label={label}
                value={kpi.value}
                loading={loading}
                {...(kpi.note ? { note: kpi.note } : {})}
                {...(kpi.tone ? { tone: kpi.tone } : {})}
                {...(kpi.deltaPercent !== undefined
                  ? { deltaPercent: kpi.deltaPercent, deltaLabel: kpi.deltaLabel ?? '' }
                  : {})}
              />
            ) : (
              <KpiCard
                key={id}
                label={label}
                value={t('analytics.noValue')}
                note={t('analytics.noData')}
              />
            );
          })}
        </section>
      )}
      <div className="wab-board">
        {def.cards.map(({ id, span }) => {
          const chart = charts[id];
          return (
            <div
              key={id}
              className="wab-board__cell"
              style={{ '--span': span, '--span-md': tabletSpan(span) } as CSSProperties}
            >
              {chart ?? (
                <SectionCard title={t(`${def.ns}.${board}.card.${id}`)} actions={cardActions[id]}>
                  {panels[id] ?? <NoData />}
                </SectionCard>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
