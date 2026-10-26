import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { deltaPercent } from '@/domain/analytics/analytics';
import { formatNumber, formatPercent } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { useLanguage } from '../hooks/useLanguage';
import { AnalyticsBoard, type BoardKpi } from './AnalyticsBoard';
import { EventsTrend } from './EventsTrend';
import { useAnalyticsRange } from './useAnalyticsRange';
import { countOf, ratioOf, useOverviewPair } from './useBoardData';
import { ANALYTICS_STRINGS } from '@/locales/lazy/analytics';
import { useLazyStrings } from '../hooks/useLazyStrings';

const PATH = '/analytics/payments';
const TRANSACTIONS_PATH = '/finance/transactions';

/** Admin PRD A08 on the design board: payment and refund server events; per-attempt rows live in Transactions. */
export default function PaymentsAnalyticsPage() {
  useLazyStrings(ANALYTICS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { value, setValue, current, previous } = useAnalyticsRange();
  const { now, before } = useOverviewPair(current, previous);
  const num = (n: number) => formatNumber(n, language);
  const pay = (name: string) => countOf(now.data, 'payments', name);
  const refund = (name: string) => countOf(now.data, 'refunds', name);
  const succeeded = pay('payment.succeeded');
  const finished = succeeded + pay('payment.failed');
  const success = ratioOf(succeeded, finished);
  // Attempts that reached an outcome: the server does not emit `payment.started` on every path (seen on the
  // local stack: 0 started, 89 finished), so counting outcomes never shows fewer attempts than results.
  const outcomes = (o: typeof now.data) =>
    ['payment.succeeded', 'payment.failed', 'payment.cancelled'].reduce(
      (n, name) => n + countOf(o, 'payments', name),
      0,
    );
  const attempts = outcomes(now.data);
  const change = before ? deltaPercent(attempts, outcomes(before)) : undefined;
  const failedRefunds = refund('refund.failed');
  const kpis: Record<string, BoardKpi> = {
    success: {
      value: success === undefined ? t('analytics.noValue') : formatPercent(success, language),
      note: t('analytics.ofFinished', { count: num(finished) }),
    },
    attempts: {
      value: num(attempts),
      ...(change !== undefined
        ? { deltaPercent: change, deltaLabel: t('analytics.vsPrevious') }
        : {}),
    },
    refunds: { value: num(refund('refund.created')) },
    refundFailed: { value: num(failedRefunds), ...(failedRefunds > 0 ? { tone: 'rose' } : {}) },
  };
  return (
    <AnalyticsBoard
      board="payments"
      path={PATH}
      filters={<DateRangePicker value={value} onChange={setValue} allowCompare />}
      loading={now.isPending}
      error={now.error}
      onRetry={() => void now.refetch()}
      kpis={kpis}
      cardActions={{
        attempts: (
          <Button variant="secondary" size="sm" onClick={() => void navigate(TRANSACTIONS_PATH)}>
            {t('analytics.openTransactions')}
          </Button>
        ),
      }}
      charts={{
        trend: (
          <EventsTrend
            title={t('analyticsOps.payments.card.trend')}
            names={Object.keys({ ...now.data?.payments, ...now.data?.refunds })}
            current={current}
            filename="payment-events-by-day"
          />
        ),
      }}
    />
  );
}
