import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { deltaPercent, OVERVIEW_GROUPS, sumCounts } from '@/domain/analytics/analytics';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { Icon } from '../components/core/Icon';
import { KpiCard } from '../components/core/KpiCard';
import { PageHeader } from '../components/core/PageHeader';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { FilterBar } from '../components/data/FilterBar';
import { LineChart } from '../components/charts/LineChart';
import { AsyncView } from '../components/feedback/AsyncView';
import { LiveIndicator } from '../components/feedback/LiveIndicator';
import { Skeleton } from '../components/feedback/Skeleton';
import { useLanguage } from '../hooks/useLanguage';
import { useShellCounters } from '../hooks/useShellCounters';
import { useAnalyticsRange } from './useAnalyticsRange';

/** Event names of one group with their counts, largest first (the KPI card breakdown). */
const partsOf = (counts: Readonly<Record<string, number>>, num: (n: number) => string) =>
  Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      key: name,
      label: <bdi className="wab-kpi__event">{name}</bdi>,
      value: num(count),
    }));

/**
 * Admin PRD A01 · Live overview (design `02 Live Overview`): live pill + today in Amman, report/alerts shortcuts,
 * range filter, payment/refund/booking/error KPIs with their event breakdown, and the per-day trend.
 */
export default function LiveOverviewPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const counters = useShellCounters(true);
  const { value, setValue, current, previous } = useAnalyticsRange();
  const num = (n: number) => formatNumber(n, language);
  // Keys start with the operation id: `booking.updated` / `alert.created` refresh these through the realtime bus.
  const overview = useQuery({
    queryKey: ['getAnalyticsOverview', current],
    queryFn: () => repositories.analytics.overview(current),
  });
  const before = useQuery({
    queryKey: ['getAnalyticsOverview', previous],
    queryFn: () => repositories.analytics.overview(previous ?? current),
    enabled: previous !== null,
  });
  const trend = useQuery({
    queryKey: ['getAnalyticsEvents', 'trend', current],
    queryFn: () => repositories.analytics.events({ ...current, groupBy: 'DAY' }),
  });
  const days = trend.data ?? [];
  const alerts = counters.alerts;
  return (
    <div className="wab-page wab-stack">
      <PageHeader
        title={t('nav.liveOverview')}
        badges={<LiveIndicator />}
        subtitle={t('overview.today', { date: formatInstant(new Date(), language, 'longDate') })}
        actions={
          <>
            <Button
              variant="ghost"
              startIcon={<Icon name="file" size="sm" />}
              onClick={() => void navigate(ROUTES.reports)}
            >
              {t('overview.todayReport')}
            </Button>
            <Button
              variant="secondary"
              startIcon={<Icon name="bell" size="sm" />}
              onClick={() => void navigate(ROUTES.alerts)}
            >
              {t('overview.alerts', { count: num(alerts) })}
            </Button>
          </>
        }
      />
      <FilterBar>
        <DateRangePicker value={value} onChange={setValue} allowCompare />
      </FilterBar>
      <AsyncView
        loading={overview.isPending}
        error={overview.error}
        onRetry={() => void overview.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        <section className="wab-kpis" aria-labelledby="overview-kpis">
          <h2 id="overview-kpis" className="wab-section-title">
            {t('overview.section')}
          </h2>
          <div className="wab-kpi-grid">
            {OVERVIEW_GROUPS.map((g) => {
              const counts = overview.data?.[g] ?? {};
              const total = sumCounts(counts);
              const delta = before.data
                ? deltaPercent(total, sumCounts(before.data[g]))
                : undefined;
              return (
                <KpiCard
                  key={g}
                  label={t(`overview.groups.${g}`)}
                  value={num(total)}
                  parts={partsOf(counts, num)}
                  {...(delta !== undefined
                    ? { deltaPercent: delta, deltaLabel: t('overview.vsPrevious') }
                    : {})}
                />
              );
            })}
          </div>
        </section>
        <LineChart
          title={t('overview.trend')}
          categoryHeader={t('overview.day')}
          labels={days.map((d) => d.key)}
          series={[
            { key: 'events', label: t('overview.events'), values: days.map((d) => d.count) },
          ]}
          filename="overview-trend"
        />
      </AsyncView>
    </div>
  );
}
