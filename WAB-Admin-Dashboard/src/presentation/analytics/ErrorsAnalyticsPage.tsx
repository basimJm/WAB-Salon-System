import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/domain/shared/format';
import { KeyValue } from '../components/core/KeyValue';
import { DateRangePicker } from '../components/data/DateRangePicker';
import { useLanguage } from '../hooks/useLanguage';
import { AnalyticsBoard } from './AnalyticsBoard';
import { EventsTrend } from './EventsTrend';
import { useAnalyticsRange } from './useAnalyticsRange';
import { countOf, useOverviewPair } from './useBoardData';
import { ANALYTICS_STRINGS } from '@/locales/lazy/analytics';
import { useLazyStrings } from '../hooks/useLazyStrings';

const PATH = '/analytics/errors';
const ITEMS = 'analyticsOps.errors.item';

/** Admin PRD A09 on the design board: error, OTP and failure server events; app-side metrics are not sent yet. */
export default function ErrorsAnalyticsPage() {
  useLazyStrings(ANALYTICS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { value, setValue, current, previous } = useAnalyticsRange();
  const { now } = useOverviewPair(current, previous);
  const num = (n: number) => formatNumber(n, language);
  const blocked = countOf(now.data, 'errors', 'otp.blocked');
  const failures = (
    <KeyValue
      placeholder={t('analytics.noData')}
      items={[
        {
          key: 'paymentFailed',
          label: t(`${ITEMS}.paymentFailed`),
          value: num(countOf(now.data, 'payments', 'payment.failed')),
        },
        {
          key: 'refundFailed',
          label: t(`${ITEMS}.refundFailed`),
          value: num(countOf(now.data, 'refunds', 'refund.failed')),
        },
        {
          key: 'apiErrors',
          label: t(`${ITEMS}.apiErrors`),
          value: num(countOf(now.data, 'errors', 'api.error')),
        },
        {
          key: 'otpWrong',
          label: t(`${ITEMS}.otpWrong`),
          value: num(countOf(now.data, 'errors', 'otp.failed')),
        },
        { key: 'pushFailed', label: t(`${ITEMS}.pushFailed`), value: null },
      ]}
    />
  );
  return (
    <AnalyticsBoard
      board="errors"
      path={PATH}
      filters={<DateRangePicker value={value} onChange={setValue} />}
      loading={now.isPending}
      error={now.error}
      onRetry={() => void now.refetch()}
      kpis={{ otpBlocked: { value: num(blocked), ...(blocked > 0 ? { tone: 'rose' } : {}) } }}
      panels={now.data ? { failures } : {}}
      charts={{
        trend: (
          <EventsTrend
            title={t('analyticsOps.errors.card.trend')}
            names={Object.keys(now.data?.errors ?? {})}
            current={current}
            filename="error-events-by-day"
          />
        ),
      }}
    />
  );
}
