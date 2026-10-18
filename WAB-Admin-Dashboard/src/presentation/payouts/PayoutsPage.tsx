import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  PAYOUT_STATUSES,
  type Payout,
  type PayoutStatus,
  type SalonBalance,
} from '@/domain/payouts/payouts';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import { Pagination } from '../components/data/Pagination';
import type { Column } from '../components/data/tableTypes';
import { Tabs } from '../components/data/Tabs';
import { Select } from '../components/form/Select';
import { PageHeader } from '../components/core/PageHeader';
import { useLanguage } from '../hooks/useLanguage';
import { CreatePayoutDrawer } from './CreatePayoutDrawer';
import { TransferDrawer } from './TransferDrawer';

const SIZE = 25;

/** Admin PRD A18 · Payouts: what each salon is owed, create a payout up to a day, record the manual bank transfer. */
export default function PayoutsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const repo = repositories.payouts;
  const [tab, setTab] = useState('balances');
  const [balancePage, setBalancePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [status, setStatus] = useState<PayoutStatus | ''>('');
  const [creating, setCreating] = useState<SalonBalance | null>(null);
  const [transferring, setTransferring] = useState<Payout | null>(null);
  const balances = useQuery({
    queryKey: ['getPayoutsBalances', balancePage],
    queryFn: () => repo.balances({ page: balancePage, pageSize: SIZE }),
  });
  const history = useQuery({
    queryKey: ['getPayouts', historyPage, status],
    queryFn: () => repo.list({ page: historyPage, pageSize: SIZE, ...(status ? { status } : {}) }),
  });
  const jod = (v: string) => `${formatJodAmount(v, language)} ${t('common.currency')}`;
  const balanceColumns: Column<SalonBalance>[] = [
    { key: 'name', header: t('salons.name'), render: (r) => r.name },
    { key: 'charges', header: t('payouts.collected'), ltr: true, render: (r) => jod(r.charges) },
    { key: 'fees', header: t('payouts.fees'), ltr: true, render: (r) => jod(r.gatewayFees) },
    { key: 'refunds', header: t('payouts.refunds'), ltr: true, render: (r) => jod(r.refunds) },
    { key: 'payouts', header: t('payouts.paidOut'), ltr: true, render: (r) => jod(r.payouts) },
    { key: 'due', header: t('payouts.dueNow'), ltr: true, render: (r) => jod(r.dueNow) },
  ];
  const historyColumns: Column<Payout>[] = [
    {
      key: 'period',
      header: t('payouts.period'),
      ltr: true,
      render: (r) =>
        `${formatInstant(r.periodFrom, language, 'date')} → ${formatInstant(r.periodTo, language, 'date')}`,
    },
    { key: 'gross', header: t('payouts.gross'), ltr: true, render: (r) => jod(r.gross) },
    { key: 'net', header: t('payouts.net'), ltr: true, render: (r) => jod(r.net) },
    {
      key: 'ref',
      header: t('payouts.reference'),
      ltr: true,
      render: (r) => r.transferReference ?? '—',
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="payout" value={r.status} />,
    },
  ];
  const pager = (
    page: number,
    total: number | undefined,
    set: (p: number) => void,
    label: string,
  ) =>
    total ? (
      <Pagination
        page={page}
        pageSize={SIZE}
        total={total}
        onPageChange={set}
        onPageSizeChange={() => undefined}
        ariaLabel={label}
      />
    ) : null;
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={t('nav.sub.payouts')} subtitle={t('payouts.subtitle')} />
      <Tabs
        ariaLabel={t('payouts.tabs')}
        activeId={tab}
        onChange={setTab}
        items={[
          {
            id: 'balances',
            label: t('payouts.balances'),
            content: (
              <>
                <DataTable
                  columns={balanceColumns}
                  rows={balances.data?.items ?? []}
                  rowKey={(r) => r.salonId}
                  caption={t('payouts.balances')}
                  loading={balances.isPending}
                  error={balances.error}
                  onRetry={() => void balances.refetch()}
                  emptyTitle={t('payouts.empty')}
                  rowActions={(r) => (
                    <Button variant="ghost" size="sm" onClick={() => setCreating(r)}>
                      {t('payouts.create')}
                    </Button>
                  )}
                />
                {pager(
                  balancePage,
                  balances.data?.meta.total,
                  setBalancePage,
                  t('payouts.balances'),
                )}
              </>
            ),
          },
          {
            id: 'history',
            label: t('payouts.history'),
            content: (
              <>
                <Select
                  label={t('salons.state')}
                  value={status}
                  options={[
                    { value: '', label: t('appConfig.all') },
                    ...PAYOUT_STATUSES.map((s) => ({ value: s, label: t(`status.payout.${s}`) })),
                  ]}
                  onChange={(e) => {
                    setHistoryPage(1);
                    setStatus(PAYOUT_STATUSES.find((s) => s === e.target.value) ?? '');
                  }}
                />
                <DataTable
                  columns={historyColumns}
                  rows={history.data?.items ?? []}
                  rowKey={(r) => r.id}
                  caption={t('payouts.history')}
                  loading={history.isPending}
                  error={history.error}
                  onRetry={() => void history.refetch()}
                  emptyTitle={t('payouts.empty')}
                  rowActions={(r) =>
                    r.status === 'PENDING' ? (
                      <Button variant="ghost" size="sm" onClick={() => setTransferring(r)}>
                        {t('payouts.recordTransfer')}
                      </Button>
                    ) : null
                  }
                />
                {pager(historyPage, history.data?.meta.total, setHistoryPage, t('payouts.history'))}
              </>
            ),
          },
        ]}
      />
      {creating ? <CreatePayoutDrawer salon={creating} onClose={() => setCreating(null)} /> : null}
      {transferring ? (
        <TransferDrawer payout={transferring} onClose={() => setTransferring(null)} />
      ) : null}
    </div>
  );
}
