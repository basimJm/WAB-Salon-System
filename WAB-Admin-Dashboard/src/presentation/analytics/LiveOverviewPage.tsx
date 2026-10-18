import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { deltaPercent, OVERVIEW_GROUPS, sumCounts } from '@/domain/analytics/analytics';
import { formatNumber } from '@/domain/shared/format';
import { KpiCard } from '../components/core/KpiCard';
import { PageHeader } from '../components/core/PageHeader';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { LineChart } from '../components/charts/LineChart';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { useLanguage } from '../hooks/useLanguage';
import { useAnalyticsRange } from './useAnalyticsRange';

/** Admin PRD A01 · Live overview: payment, refund, booking and error counts for a range, and the per-day trend. */
export default function LiveOverviewPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const { value, setValue, current, previous } = useAnalyticsRange();
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
  return (
    <div className="wab-page wab-stack">
      <PageHeader
        title={t('nav.liveOverview')}
        subtitle={t('overview.subtitle')}
        actions={<DateRangePicker value={value} onChange={setValue} allowCompare />}
      />
      <AsyncView
        loading={overview.isPending}
        error={overview.error}
        onRetry={() => void overview.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        <div className="wab-kpi-grid">
          {OVERVIEW_GROUPS.map((g) => {
            const total = overview.data ? sumCounts(overview.data[g]) : 0;
            const delta = before.data ? deltaPercent(total, sumCounts(before.data[g])) : undefined;
            return (
              <KpiCard
                key={g}
                label={t(`overview.groups.${g}`)}
                value={formatNumber(total, language)}
                {...(delta !== undefined
                  ? { deltaPercent: delta, deltaLabel: t('overview.vsPrevious') }
                  : {})}
              />
            );
          })}
        </div>
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
