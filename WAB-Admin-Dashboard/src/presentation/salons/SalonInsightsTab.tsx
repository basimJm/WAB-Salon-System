import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { completionRatePct } from '@/domain/salons/salonRules';
import { formatNumber, formatPercent } from '@/domain/shared/format';
import { addDays, isLocalDate, localDateOf } from '@/domain/shared/time';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { KpiCard } from '../components/core/KpiCard';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { DateField } from '../components/form/DateField';
import { useLanguage } from '../hooks/useLanguage';

const DEFAULT_RANGE_DAYS = 29;
const STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

function Kpis({ id }: { id: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getSalonsByIdKpis', id],
    queryFn: () => repositories.salons.kpis(id),
  });
  const n = (v: number) => formatNumber(v, language);
  return (
    <AsyncView
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {q.data ? (
        <>
          <div className="wab-kpi-grid">
            <KpiCard
              label={t('salons.kpi.rating')}
              value={`${n(q.data.rating.avg)} (${n(q.data.rating.count)})`}
            />
            <KpiCard label={t('salons.kpi.bookings')} value={n(q.data.bookings.total)} />
            <KpiCard label={t('salons.bookings30d')} value={n(q.data.bookings.last30d)} />
            <KpiCard
              label={t('salons.kpi.completion')}
              value={formatPercent(completionRatePct(q.data.bookings.byStatus30d) / 100, language)}
            />
            <KpiCard label={t('salons.kpi.services')} value={n(q.data.activeServices)} />
            <KpiCard label={t('salons.kpi.staff')} value={n(q.data.activeStaff)} />
          </div>
          <BarChart
            title={t('salons.kpi.byStatus30d')}
            categoryHeader={t('salons.state')}
            labels={STATUSES.map((s) => t(`status.booking.${s}`))}
            series={[
              {
                key: 'count',
                label: t('salons.kpi.bookings'),
                values: STATUSES.map((s) => q.data.bookings.byStatus30d[s] ?? 0),
              },
            ]}
            filename="salon-bookings-30d"
          />
        </>
      ) : null}
    </AsyncView>
  );
}

function Trend({ id }: { id: string }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const today = localDateOf(new Date());
  const [from, setFrom] = useState(addDays(today, -DEFAULT_RANGE_DAYS));
  const [to, setTo] = useState(today);
  const valid = isLocalDate(from) && isLocalDate(to) && from <= to;
  const q = useQuery({
    queryKey: ['getSalonsByIdAnalytics', id, from, to],
    queryFn: () => repositories.salons.analytics(id, { from, to }),
    enabled: valid,
  });
  return (
    <div className="wab-stack">
      <div className="wab-settings__grid">
        <DateField label={t('salons.kpi.from')} value={from} max={today} onValueChange={setFrom} />
        <DateField
          label={t('salons.kpi.to')}
          value={to}
          max={today}
          onValueChange={setTo}
          error={valid || from === '' || to === '' ? undefined : t('salons.kpi.rangeError')}
        />
      </div>
      {valid ? (
        <AsyncView
          loading={q.isPending}
          error={q.error}
          onRetry={() => void q.refetch()}
          skeleton={<Skeleton height="lg" />}
        >
          {q.data ? (
            <LineChart
              title={t('salons.kpi.trend')}
              categoryHeader={t('overview.day')}
              labels={q.data.days.map((d) => d.date)}
              series={[
                {
                  key: 'bookings',
                  label: t('salons.kpi.bookings'),
                  values: q.data.days.map((d) => d.bookings),
                },
              ]}
              filename="salon-bookings-trend"
            />
          ) : null}
        </AsyncView>
      ) : null}
    </div>
  );
}

/** Admin PRD A13 · numbers of one salon: rating, bookings, completion, and bookings per day for a range. */
export function SalonInsightsTab({ id }: { id: string }) {
  return (
    <div className="wab-stack">
      <Kpis id={id} />
      <Trend id={id} />
    </div>
  );
}
