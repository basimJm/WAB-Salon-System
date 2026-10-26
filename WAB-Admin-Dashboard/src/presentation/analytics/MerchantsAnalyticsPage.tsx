import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { ENDING_SOON_DAYS } from '@/constants/analytics';
import { SALON_STATES } from '@/domain/salons/salons';
import { formatNumber } from '@/domain/shared/format';
import type { SubscriptionStatus } from '@/domain/subscriptions/subscriptions';
import { DonutChart } from '../components/charts/DonutChart';
import { useLanguage } from '../hooks/useLanguage';
import { AnalyticsBoard, type BoardKpi } from './AnalyticsBoard';
import { pendingOrError } from './boardStates';
import { ANALYTICS_STRINGS } from '@/locales/lazy/analytics';
import { useLazyStrings } from '../hooks/useLazyStrings';

const PATH = '/analytics/merchants';
/** Smallest page: only `meta.total` is read (the counts behind the KPIs and the state ring). */
const COUNT_PAGE = { page: 1, pageSize: 1 } as const;
type SubscriptionCount = { kpi: string; status?: SubscriptionStatus; endingInDays?: number };
const SUBSCRIPTION_COUNTS: readonly SubscriptionCount[] = [
  { kpi: 'trials', status: 'TRIAL' },
  { kpi: 'ending', endingInDays: ENDING_SOON_DAYS },
  { kpi: 'expired', status: 'EXPIRED' },
  { kpi: 'paid', status: 'ACTIVE' },
];

/**
 * Admin PRD A10 on the design board: today's subscription counts and salons per state, read as list totals from
 * the subscriptions and salons endpoints (a snapshot, so no range filter). Performance and activity are not sent.
 */
export default function MerchantsAnalyticsPage() {
  useLazyStrings(ANALYTICS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const subs = useQueries({
    queries: SUBSCRIPTION_COUNTS.map(({ kpi, ...filter }) => ({
      queryKey: ['getSubscriptions', 'count', kpi],
      queryFn: () =>
        repositories.subscriptions.list({ ...COUNT_PAGE, ...filter }).then((p) => p.meta.total),
    })),
  });
  const states = useQueries({
    queries: SALON_STATES.map((state) => ({
      queryKey: ['getSalons', 'count', state],
      queryFn: () => repositories.salons.list({ ...COUNT_PAGE, state }).then((p) => p.meta.total),
    })),
  });
  const subsError = subs.find((q) => q.error)?.error ?? null;
  const kpis: Record<string, BoardKpi> = Object.fromEntries(
    SUBSCRIPTION_COUNTS.map(({ kpi }, i) => [
      kpi,
      { value: formatNumber(subs[i]?.data ?? 0, language) },
    ]),
  );
  const stateState = {
    pending: states.some((q) => q.isPending),
    error: states.find((q) => q.error)?.error ?? null,
  };
  const byState = (
    <DonutChart
      title={t('analyticsOps.merchants.card.byState')}
      headers={[t('analytics.status'), t('analytics.count'), t('analytics.share')]}
      data={SALON_STATES.map((state, i) => ({
        key: state,
        label: t(`status.salon.${state}`),
        value: states[i]?.data ?? 0,
      }))}
      centerLabel={t('analyticsOps.merchants.salons')}
      filename="salons-by-state"
    />
  );
  const ready = !stateState.pending && !stateState.error;
  return (
    <AnalyticsBoard
      board="merchants"
      path={PATH}
      loading={subs.some((q) => q.isPending)}
      error={subsError}
      onRetry={() => subs.forEach((q) => void q.refetch())}
      kpis={kpis}
      kpiParams={{ ending: { days: formatNumber(ENDING_SOON_DAYS, language) } }}
      charts={ready ? { byState } : {}}
      panels={pendingOrError(stateState, 'byState')}
    />
  );
}
