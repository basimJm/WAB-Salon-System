import { useTranslation } from 'react-i18next';
import { deltaPercent } from '@/domain/analytics/analytics';
import { formatNumber, formatPercent } from '@/domain/shared/format';
import { BarChart } from '../components/charts/BarChart';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { useLanguage } from '../hooks/useLanguage';
import { AnalyticsBoard, type BoardKpi } from './AnalyticsBoard';
import { useAnalyticsRange } from './useAnalyticsRange';
import { countOf, ratioOf, useDailyByName, useOverviewPair } from './useBoardData';
import { pendingOrError } from './boardStates';
import { ANALYTICS_STRINGS } from '@/locales/lazy/analytics';
import { useLazyStrings } from '../hooks/useLazyStrings';

const PATH = '/analytics/bookings';
/** Stack order of the design's "Bookings by status" chart. */
const STATUS_EVENTS = [
  'booking.completed',
  'booking.approved',
  'booking.cancelled',
  'booking.rejected',
  'booking.no_show',
] as const;
const statusKey = (name: string): string => name.slice(name.indexOf('.') + 1);

/** Admin PRD A07 on the design board: server booking events (counts, acceptance, per-day status stack). */
export default function BookingsAnalyticsPage() {
  useLazyStrings(ANALYTICS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { value, setValue, current, previous } = useAnalyticsRange();
  const { now, before } = useOverviewPair(current, previous);
  const daily = useDailyByName(STATUS_EVENTS, current);
  const num = (n: number) => formatNumber(n, language);
  const count = (name: string) => countOf(now.data, 'bookings', name);
  const created = count('booking.created');
  const approved = count('booking.approved');
  const decided = approved + count('booking.rejected');
  const acceptance = ratioOf(approved, decided);
  const change = before
    ? deltaPercent(created, countOf(before, 'bookings', 'booking.created'))
    : undefined;
  const kpis: Record<string, BoardKpi> = {
    bookings: {
      value: num(created),
      ...(change !== undefined
        ? { deltaPercent: change, deltaLabel: t('analytics.vsPrevious') }
        : {}),
    },
    acceptance: {
      value:
        acceptance === undefined ? t('analytics.noValue') : formatPercent(acceptance, language),
      note: t('analytics.ofDecisions', { count: num(decided) }),
    },
    autoCancelled: { value: num(count('booking.auto_cancelled')) },
    noShow: { value: num(count('booking.no_show')) },
  };
  const byStatus = (
    <BarChart
      title={t('analyticsOps.bookings.card.byStatus')}
      categoryHeader={t('analytics.day')}
      labels={daily.series.labels}
      series={STATUS_EVENTS.map((name, i) => ({
        key: name,
        label: t(`analyticsOps.bookings.status.${statusKey(name)}`),
        values: daily.series.values[i] ?? [],
      }))}
      filename="bookings-by-status"
      stacked
    />
  );
  return (
    <AnalyticsBoard
      board="bookings"
      path={PATH}
      filters={<DateRangePicker value={value} onChange={setValue} allowCompare />}
      loading={now.isPending}
      error={now.error}
      onRetry={() => void now.refetch()}
      kpis={kpis}
      charts={daily.pending || daily.error ? {} : { byStatus }}
      panels={pendingOrError(daily, 'byStatus')}
    />
  );
}
