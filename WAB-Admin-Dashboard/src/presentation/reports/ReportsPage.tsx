import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { isMonth, REPORT_KINDS, type ReportKind } from '@/domain/reports/reports';
import { localDateOf } from '@/domain/shared/time';
import { Card } from '../components/core/Card';
import { KeyValue } from '../components/core/KeyValue';
import { PageHeader } from '../components/core/PageHeader';
import { Tabs } from '../components/data/Tabs';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { DateField } from '../components/form/DateField';
import { TextField } from '../components/form/TextField';
import { useLanguage } from '../hooks/useLanguage';
import { ReportBody, SnapshotCard, TopSalonsChart, useReportFormat } from './ReportBody';

/** Admin PRD A24 · daily, weekly and monthly numbers for the business (Asia/Amman days). */
export default function ReportsPage() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ReportKind>('daily');
  const today = localDateOf(new Date());
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const dayInput = (label: string) => (
    <DateField label={label} value={day} onValueChange={setDay} max={today} />
  );
  const content: Record<ReportKind, React.ReactNode> = {
    daily: (
      <>
        {dayInput(t('reports.day'))}
        <Daily date={day} />
      </>
    ),
    weekly: (
      <>
        {dayInput(t('reports.weekStart'))}
        <Weekly from={day} />
      </>
    ),
    monthly: (
      <>
        <TextField
          label={t('reports.month')}
          dir="ltr"
          value={month}
          error={isMonth(month) ? undefined : t('reports.error.month')}
          onChange={(e) => setMonth(e.target.value.trim())}
        />
        {isMonth(month) ? <Monthly month={month} /> : null}
      </>
    ),
  };
  return (
    <>
      <PageHeader title={t('nav.reports')} subtitle={t('reports.subtitle')} />
      <Tabs
        ariaLabel={t('reports.kinds')}
        activeId={kind}
        onChange={(id) => setKind(REPORT_KINDS.find((k) => k === id) ?? 'daily')}
        items={REPORT_KINDS.map((k) => ({
          id: k,
          label: t(`reports.kind.${k}`),
          content: <div className="wab-stack">{content[k]}</div>,
        }))}
      />
    </>
  );
}

function Daily({ date }: { date: string }) {
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getReportsDaily', date],
    queryFn: () => repositories.reports.daily(date),
    enabled: date !== '',
  });
  return (
    <AsyncView loading={q.isPending} error={q.error} onRetry={() => void q.refetch()} skeleton={<Skeleton height="lg" />}>
      {q.data ? (
        <>
          <ReportBody report={q.data} language={language} />
          <SnapshotCard snapshot={q.data.snapshot} language={language} />
        </>
      ) : null}
    </AsyncView>
  );
}

function Weekly({ from }: { from: string }) {
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getReportsWeekly', from],
    queryFn: () => repositories.reports.weekly(from),
    enabled: from !== '',
  });
  return (
    <AsyncView loading={q.isPending} error={q.error} onRetry={() => void q.refetch()} skeleton={<Skeleton height="lg" />}>
      {q.data ? (
        <>
          <ReportBody report={q.data} language={language} />
          <TopSalonsChart salons={q.data.topSalons} />
        </>
      ) : null}
    </AsyncView>
  );
}

function Monthly({ month }: { month: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { n, jod } = useReportFormat(language);
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getReportsMonthly', month],
    queryFn: () => repositories.reports.monthly(month),
  });
  const data = q.data;
  return (
    <AsyncView loading={q.isPending} error={q.error} onRetry={() => void q.refetch()} skeleton={<Skeleton height="lg" />}>
      {data ? (
        <>
          <ReportBody report={data} language={language} />
          <TopSalonsChart salons={data.topSalons} />
          <Card aria-label={t('reports.payouts')}>
            <h2 className="wab-settings__title">{t('reports.payouts')}</h2>
<KeyValue placeholder={t('salons.none')} items={[{ key: '0', label: t('reports.payouts'), value: `${n(data.payouts.count)} · ${jod(data.payouts.amount)}` }]} />
</Card>
          <SnapshotCard snapshot={data.snapshot} language={language} />
        </>
      ) : null}
    </AsyncView>
  );
}
