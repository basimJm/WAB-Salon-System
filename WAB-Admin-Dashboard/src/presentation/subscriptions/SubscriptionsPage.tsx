import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { formatInstant, formatJodAmount, formatNumber } from '@/domain/shared/format';
import {
  ENDING_WINDOWS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionPayment,
} from '@/domain/subscriptions/subscriptions';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { Select } from '../components/form/Select';
import { Drawer } from '../components/overlay/Drawer';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { PaymentDrawer } from './PaymentDrawer';

const OPTIONS = { filterKeys: ['status', 'ending'] };

/** Admin PRD A19 · Salon subscriptions: status, days left, payments recorded by hand. */
export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const status = SUBSCRIPTION_STATUSES.find((s) => s === state.filters['status']?.[0]);
  const ending = ENDING_WINDOWS.find((d) => String(d) === state.filters['ending']?.[0]);
  const [recording, setRecording] = useState<Subscription | null>(null);
  const [viewing, setViewing] = useState<Subscription | null>(null);
  const query = useQuery({
    queryKey: ['getSubscriptions', state],
    queryFn: () =>
      repositories.subscriptions.list({
        page: state.page,
        pageSize: state.pageSize,
        ...(status ? { status } : {}),
        ...(ending ? { endingInDays: ending } : {}),
      }),
  });
  const date = (iso: string) => formatInstant(iso, language, 'date');
  const title = t('nav.sub.subscriptions');
  const columns: Column<Subscription>[] = [
    { key: 'name', header: t('salons.name'), render: (r) => r.salonName },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="subscription" value={r.status} />,
    },
    { key: 'ends', header: t('subscriptions.endsAt'), ltr: true, render: (r) => date(r.endsAt) },
    {
      key: 'days',
      header: t('subscriptions.daysLeft'),
      ltr: true,
      render: (r) => formatNumber(r.daysRemaining, language),
    },
    {
      key: 'last',
      header: t('subscriptions.lastPayment'),
      ltr: true,
      render: (r) =>
        r.lastPayment
          ? `${formatJodAmount(r.lastPayment.amount, language)} ${t('common.currency')}`
          : '—',
    },
  ];
  const paymentColumns: Column<SubscriptionPayment>[] = [
    { key: 'paid', header: t('subscriptions.paidAt'), ltr: true, render: (p) => date(p.paidAt) },
    {
      key: 'amount',
      header: t('subscriptions.amount'),
      ltr: true,
      render: (p) => `${formatJodAmount(p.amount, language)} ${t('common.currency')}`,
    },
    {
      key: 'period',
      header: t('subscriptions.period'),
      ltr: true,
      render: (p) => `${date(p.periodFrom)} → ${date(p.periodTo)}`,
    },
    { key: 'ref', header: t('subscriptions.reference'), ltr: true, render: (p) => p.reference },
  ];
  const data = query.data;
  const all = { value: '', label: t('appConfig.all') };
  const chips = [
    ...(status
      ? [
          {
            key: 'status',
            label: `${t('salons.state')}: ${t(`status.subscription.${status}`)}`,
            onRemove: () => list.setFilter('status', []),
          },
        ]
      : []),
    ...(ending
      ? [
          {
            key: 'ending',
            label: t('subscriptions.endingIn', { days: ending }),
            onRemove: () => list.setFilter('ending', []),
          },
        ]
      : []),
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('subscriptions.subtitle')}
        filters={{
          active: chips,
          onClearAll: list.clearFilters,
          controls: (
            <>
              <Select
                label={t('salons.state')}
                value={status ?? ''}
                options={[
                  all,
                  ...SUBSCRIPTION_STATUSES.map((s) => ({
                    value: s,
                    label: t(`status.subscription.${s}`),
                  })),
                ]}
                onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
              />
              <Select
                label={t('subscriptions.ending')}
                value={ending ? String(ending) : ''}
                options={[
                  all,
                  ...ENDING_WINDOWS.map((d) => ({
                    value: String(d),
                    label: t('subscriptions.endingIn', { days: d }),
                  })),
                ]}
                onChange={(e) => list.setFilter('ending', e.target.value ? [e.target.value] : [])}
              />
            </>
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.salonId,
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('subscriptions.empty'),
          rowActions: (r) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
                {t('subscriptions.payments')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRecording(r)}>
                {t('subscriptions.record')}
              </Button>
            </>
          ),
        }}
        pagination={
          data
            ? {
                page: state.page,
                pageSize: state.pageSize,
                total: data.meta.total,
                onPageChange: list.setPage,
                onPageSizeChange: list.setPageSize,
                ariaLabel: title,
              }
            : undefined
        }
      />
      {recording ? (
        <PaymentDrawer subscription={recording} onClose={() => setRecording(null)} />
      ) : null}
      <Drawer
        open={viewing !== null}
        title={t('subscriptions.paymentsOf', { name: viewing?.salonName ?? '' })}
        onClose={() => setViewing(null)}
      >
        <DataTable
          columns={paymentColumns}
          rows={viewing?.payments ?? []}
          rowKey={(p) => `${p.paidAt}-${p.reference}`}
          caption={t('subscriptions.payments')}
          emptyTitle={t('subscriptions.noPayments')}
        />
      </Drawer>
    </>
  );
}
