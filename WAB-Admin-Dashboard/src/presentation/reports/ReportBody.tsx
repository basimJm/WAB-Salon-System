import { useTranslation } from 'react-i18next';
import { formatJodAmount, formatNumber } from '@/domain/shared/format';
import type { Language } from '@/constants/i18n';
import type { ReportNumbers, ReportSnapshot, TopSalon } from '@/domain/reports/reports';
import { BarChart } from '../components/charts/BarChart';
import { Card } from '../components/core/Card';
import { KeyValue } from '../components/core/KeyValue';
import { KpiCard } from '../components/core/KpiCard';

const BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export function useReportFormat(language: Language) {
  const { t } = useTranslation();
  return {
    n: (value: number) => formatNumber(value, language),
    jod: (amount: string) => `${formatJodAmount(amount, language)} ${t('common.currency')}`,
  };
}

/** The numbers every report period has: KPIs, bookings by status, payments and refunds. */
export function ReportBody({ report, language }: { report: ReportNumbers; language: Language }) {
  const { t } = useTranslation();
  const { n, jod } = useReportFormat(language);
  const statuses = BOOKING_STATUSES.filter((s) => (report.bookings.byStatus[s] ?? 0) > 0);
  return (
    <>
      <div className="wab-kpi-grid">
        <KpiCard label={t('reports.bookings')} value={n(report.bookings.total)} />
        <KpiCard label={t('reports.collected')} value={jod(report.payments.collected)} />
        <KpiCard label={t('reports.registrations')} value={n(report.registrations.customers)} />
        <KpiCard label={t('reports.reviews')} value={n(report.reviews.submitted)} />
      </div>
      <BarChart
        title={t('reports.byStatus')}
        categoryHeader={t('salons.state')}
        labels={statuses.map((s) => t(`status.booking.${s}`))}
        series={[
          {
            key: 'count',
            label: t('reports.bookings'),
            values: statuses.map((s) => report.bookings.byStatus[s] ?? 0),
          },
        ]}
        filename="report-bookings-by-status"
      />
      <Card aria-label={t('reports.payments')}>
        <h2 className="wab-settings__title">{t('reports.payments')}</h2>
<KeyValue placeholder={t('salons.none')} items={[{ key: '0', label: t('reports.attempts'), value: n(report.payments.attempts) },
{ key: '1', label: t('reports.succeeded'), value: n(report.payments.succeeded) },
{ key: '2', label: t('reports.failed'), value: n(report.payments.failed) },
{ key: '3', label: t('reports.refunds'), value: `${n(report.refunds.completed)} / ${n(report.refunds.created)} · ${jod(report.refunds.amount)}` }]} />
</Card>
    </>
  );
}

export function TopSalonsChart({ salons }: { salons: readonly TopSalon[] }) {
  const { t } = useTranslation();
  return (
    <BarChart
      title={t('reports.topSalons')}
      categoryHeader={t('nav.salons')}
      labels={salons.map((s) => s.salonId)}
      series={[
        { key: 'bookings', label: t('reports.bookings'), values: salons.map((s) => s.bookings) },
        { key: 'completed', label: t('status.booking.COMPLETED'), values: salons.map((s) => s.completed) },
        { key: 'lost', label: t('reports.failed'), values: salons.map((s) => s.lost) },
      ]}
      filename="report-top-salons"
    />
  );
}

export function SnapshotCard({ snapshot, language }: { snapshot: ReportSnapshot; language: Language }) {
  const { t } = useTranslation();
  const { n } = useReportFormat(language);
  const s = snapshot.subscriptions;
  return (
    <Card aria-label={t('reports.snapshot')}>
      <h2 className="wab-settings__title">{t('reports.snapshot')}</h2>
<KeyValue placeholder={t('salons.none')} items={[{ key: '0', label: t('reports.reviewsPending'), value: n(snapshot.reviewsPending) },
{ key: '1', label: t('reports.refundsPending'), value: n(snapshot.refundsPending) },
{ key: '2', label: t('reports.applicationsPending'), value: n(snapshot.applicationsPending) },
{ key: '3', label: t('reports.subscriptions'), value: `${n(s.trial)} / ${n(s.active)} / ${n(s.expired)}` }]} />
</Card>
  );
}
