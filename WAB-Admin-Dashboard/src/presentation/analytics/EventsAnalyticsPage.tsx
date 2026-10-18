import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { withPrefix } from '@/domain/analytics/analytics';
import { PageHeader } from '../components/core/PageHeader';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { useAnalyticsRange } from './useAnalyticsRange';

export interface EventsAnalyticsPageProps {
  titleKey: string;
  /** Event-name prefix this page is about (`booking.`, `payment.`...). */
  prefix: string;
}

/** Counts of one family of server events by name and by day for a range (Admin PRD A07-A09, server-event part). */
export function EventsAnalyticsPage({ titleKey, prefix }: EventsAnalyticsPageProps) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const { value, setValue, current } = useAnalyticsRange();
  const byName = useQuery({
    queryKey: ['getAnalyticsEvents', 'name', prefix, current],
    queryFn: () => repositories.analytics.events({ ...current, groupBy: 'NAME' }),
  });
  const names = withPrefix(byName.data ?? [], prefix);
  const byDay = useQuery({
    queryKey: ['getAnalyticsEvents', 'day', prefix, current, names.map((n) => n.key)],
    queryFn: () =>
      repositories.analytics.events({ ...current, groupBy: 'DAY', names: names.map((n) => n.key) }),
    enabled: names.length > 0,
  });
  const days = byDay.data ?? [];
  return (
    <div className="wab-page wab-stack">
      <PageHeader
        title={t(titleKey)}
        actions={<DateRangePicker value={value} onChange={setValue} />}
      />
      <AsyncView
        loading={byName.isPending}
        error={byName.error}
        onRetry={() => void byName.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        {names.length === 0 ? (
          <p>{t('overview.noEvents')}</p>
        ) : (
          <>
            <BarChart
              title={t('overview.byName')}
              categoryHeader={t('overview.event')}
              labels={names.map((n) => n.key)}
              series={[
                { key: 'count', label: t('overview.events'), values: names.map((n) => n.count) },
              ]}
              filename={`events-${prefix}`}
            />
            <LineChart
              title={t('overview.trend')}
              categoryHeader={t('overview.day')}
              labels={days.map((d) => d.key)}
              series={[
                { key: 'events', label: t('overview.events'), values: days.map((d) => d.count) },
              ]}
              filename={`events-${prefix}-by-day`}
            />
          </>
        )}
      </AsyncView>
    </div>
  );
}

export const BookingsAnalyticsPage = () => (
  <EventsAnalyticsPage titleKey="nav.sub.bookingsAnalytics" prefix="booking." />
);
export const PaymentsAnalyticsPage = () => (
  <EventsAnalyticsPage titleKey="nav.sub.payments" prefix="payment." />
);
export const ErrorsAnalyticsPage = () => (
  <EventsAnalyticsPage titleKey="nav.sub.errors" prefix="api." />
);
