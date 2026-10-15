import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionQuery,
} from '@/domain/transactions/transactions';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { isLocalDate, localDayRange } from '@/domain/shared/time';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { DateField } from '../components/form/DateField';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';

const OPTIONS = { filterKeys: ['status', 'type', 'from', 'to', 'salon', 'customer', 'booking'] };
const DETAILS = '/finance/transactions';

/** The URL list state -> the API query (days are Amman days, `to` included). */
function queryOf(
  filters: Readonly<Record<string, readonly string[]>>,
  page: number,
  pageSize: number,
): TransactionQuery {
  const first = (k: string) => filters[k]?.[0];
  const status = TRANSACTION_STATUSES.find((s) => s === first('status'));
  const type = TRANSACTION_TYPES.find((s) => s === first('type'));
  const from = first('from');
  const to = first('to');
  return {
    page,
    pageSize,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(from && isLocalDate(from) ? { from: localDayRange(from).start.toISOString() } : {}),
    ...(to && isLocalDate(to) ? { to: localDayRange(to).end.toISOString() } : {}),
    ...(first('salon') ? { salonId: first('salon') } : {}),
    ...(first('customer') ? { customerId: first('customer') } : {}),
    ...(first('booking') ? { bookingId: first('booking') } : {}),
  };
}

/** Admin PRD A16 · Payment attempts with the gateway code and fee; open one for the raw answer and all attempts. */
export default function TransactionsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const f = (k: string) => state.filters[k]?.[0] ?? '';
  const query = useQuery({
    queryKey: ['getTransactions', state],
    queryFn: () =>
      repositories.transactions.list(queryOf(state.filters, state.page, state.pageSize)),
  });
  const jod = (v: string | null) =>
    v ? `${formatJodAmount(v, language)} ${t('common.currency')}` : '—';
  const title = t('nav.sub.transactions');
  const columns: Column<Transaction>[] = [
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    {
      key: 'type',
      header: t('transactions.type'),
      render: (r) => t(`transactions.types.${r.type}`),
    },
    { key: 'amount', header: t('transactions.amount'), ltr: true, render: (r) => jod(r.amount) },
    { key: 'fee', header: t('transactions.fee'), ltr: true, render: (r) => jod(r.gatewayFee) },
    { key: 'attempt', header: t('transactions.attempt'), ltr: true, render: (r) => r.attempt },
    {
      key: 'code',
      header: t('transactions.gatewayCode'),
      ltr: true,
      render: (r) => r.gatewayCode ?? '—',
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="transaction" value={r.status} />,
    },
  ];
  const all = { value: '', label: t('appConfig.all') };
  const chip = (key: string, label: string, value: string) =>
    value ? [{ key, label: `${label}: ${value}`, onRemove: () => list.setFilter(key, []) }] : [];
  const chips = [
    ...chip(
      'status',
      t('salons.state'),
      f('status') && t(`status.transaction.${f('status')}`, { defaultValue: f('status') }),
    ),
    ...chip(
      'type',
      t('transactions.type'),
      f('type') && t(`transactions.types.${f('type')}`, { defaultValue: f('type') }),
    ),
    ...chip('from', t('bookings.from'), f('from')),
    ...chip('to', t('bookings.to'), f('to')),
    ...chip('booking', t('transactions.booking'), f('booking')),
  ];
  const data = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('transactions.subtitle')}
      filters={{
        active: chips,
        onClearAll: list.clearFilters,
        controls: (
          <>
            <Select
              label={t('salons.state')}
              value={f('status')}
              options={[
                all,
                ...TRANSACTION_STATUSES.map((s) => ({
                  value: s,
                  label: t(`status.transaction.${s}`),
                })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('transactions.type')}
              value={f('type')}
              options={[
                all,
                ...TRANSACTION_TYPES.map((s) => ({
                  value: s,
                  label: t(`transactions.types.${s}`),
                })),
              ]}
              onChange={(e) => list.setFilter('type', e.target.value ? [e.target.value] : [])}
            />
            <DateField
              label={t('bookings.from')}
              value={f('from')}
              onValueChange={(v) => list.setFilter('from', v ? [v] : [])}
            />
            <DateField
              label={t('bookings.to')}
              value={f('to')}
              onValueChange={(v) => list.setFilter('to', v ? [v] : [])}
            />
          </>
        ),
      }}
      table={{
        columns,
        rows: data?.items ?? [],
        rowKey: (r) => r.id,
        caption: title,
        loading: query.isPending,
        error: query.error,
        onRetry: () => void query.refetch(),
        emptyTitle: t('transactions.empty'),
        onRowClick: (r) => void navigate(`${DETAILS}/${r.id}`),
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
  );
}
