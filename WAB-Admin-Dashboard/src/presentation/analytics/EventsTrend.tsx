import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { LineChart } from '../components/charts/LineChart';
import { SectionCard } from '../components/core/SectionCard';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import type { InstantPair } from './useAnalyticsRange';

/** Sum of the given server events per day over the range (the server-event trend card of A08/A09). */
export function EventsTrend({
  title,
  names,
  current,
  filename,
}: {
  title: string;
  names: readonly string[];
  current: InstantPair;
  filename: string;
}) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const days = useQuery({
    queryKey: ['getAnalyticsEvents', 'day', names, current],
    queryFn: () => repositories.analytics.events({ ...current, groupBy: 'DAY', names }),
    enabled: names.length > 0,
  });
  const rows = days.data ?? [];
  const pending = names.length > 0 && days.isPending;
  if (pending || days.error)
    return (
      <SectionCard title={title}>
        <AsyncView
          loading={pending}
          error={days.error}
          onRetry={() => void days.refetch()}
          skeleton={<Skeleton height="lg" />}
        >
          {null}
        </AsyncView>
      </SectionCard>
    );
  return (
    <LineChart
      title={title}
      categoryHeader={t('analytics.day')}
      labels={rows.map((d) => d.key)}
      series={[{ key: 'events', label: t('analytics.events'), values: rows.map((d) => d.count) }]}
      filename={filename}
    />
  );
}
