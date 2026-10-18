import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import {
  BOOKING_STATUSES,
  BOOKING_TABS,
  PAYMENT_STATUSES,
  type BookingSummary,
} from '@/domain/bookings/bookings';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { DateField } from '../components/form/DateField';
import { SearchField } from '../components/form/SearchField';
import { SegmentedControl } from '../components/form/SegmentedControl';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { BOOKING_FILTER_KEYS, bookingQueryOf } from './bookingFilters';

const OPTIONS = { filterKeys: BOOKING_FILTER_KEYS };
const ALL_TABS = 'ALL';

/** Admin PRD A15 · All bookings: tabs, filters, search; refreshes itself when the server pushes `booking.updated`. */
export default function BookingsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const f = (key: string) => state.filters[key]?.[0] ?? '';
  const query = useQuery({
    queryKey: ['getBookings', state],
    queryFn: () => repositories.bookings.list(bookingQueryOf(state)),
  });
  const title = t('nav.bookings');
  const columns: Column<BookingSummary>[] = [
    { key: 'ref', header: t('bookings.reference'), ltr: true, render: (r) => r.referenceNumber },
    { key: 'customer', header: t('bookings.customer'), render: (r) => r.customer?.name ?? '—' },
    { key: 'salon', header: t('bookings.salon'), render: (r) => r.salon?.name ?? '—' },
    {
      key: 'when',
      header: t('bookings.appointment'),
      ltr: true,
      render: (r) => formatInstant(r.appointmentStart, language, 'dateTime'),
    },
    {
      key: 'persons',
      header: t('bookings.persons'),
      ltr: true,
      render: (r) =>
        r.hasBride ? `${String(r.personsCount)} · ${t('bookings.bride')}` : r.personsCount,
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="booking" value={r.status} />,
    },
    {
      key: 'payment',
      header: t('bookings.payment'),
      render: (r) => (
        <Badge tone="grey">
          {t(`bookings.paymentStatus.${r.paymentStatus}`, { defaultValue: r.paymentStatus })}
        </Badge>
      ),
    },
    {
      key: 'total',
      header: t('bookings.total'),
      ltr: true,
      render: (r) => `${formatJodAmount(r.total, language)} ${t('common.currency')}`,
    },
  ];
  const all = { value: '', label: t('appConfig.all') };
  const chip = (key: string, label: string, value: string) =>
    value ? [{ key, label: `${label}: ${value}`, onRemove: () => list.setFilter(key, []) }] : [];
  const chips = [
    ...chip(
      'status',
      t('salons.state'),
      f('status') && t(`status.booking.${f('status')}`, { defaultValue: f('status') }),
    ),
    ...chip(
      'payment',
      t('bookings.payment'),
      f('payment') && t(`bookings.paymentStatus.${f('payment')}`, { defaultValue: f('payment') }),
    ),
    ...chip('bride', t('bookings.bride'), f('bride') ? t('bookings.brideOnly') : ''),
    ...chip('from', t('bookings.from'), f('from')),
    ...chip('to', t('bookings.to'), f('to')),
    ...chip('salon', t('bookings.salon'), f('salon')),
    ...chip('customer', t('bookings.customer'), f('customer')),
  ];
  const data = query.data;
  const tab = BOOKING_TABS.find((x) => x === f('tab')) ?? ALL_TABS;
  return (
    <ListPage
      title={title}
      subtitle={t('bookings.subtitle')}
      actions={
        <SegmentedControl
          ariaLabel={t('bookings.tabs')}
          value={tab}
          options={[
            { value: ALL_TABS, label: t('appConfig.all') },
            ...BOOKING_TABS.map((x) => ({ value: x, label: t(`bookings.tab.${x}`) })),
          ]}
          onChange={(v) => list.setFilter('tab', v === ALL_TABS ? [] : [v])}
        />
      }
      filters={{
        active: chips,
        onClearAll: list.clearFilters,
        controls: (
          <>
            <SearchField
              label={t('bookings.search')}
              initialValue={state.search}
              onSearch={list.setSearch}
            />
            <Select
              label={t('salons.state')}
              value={f('status')}
              options={[
                all,
                ...BOOKING_STATUSES.map((s) => ({ value: s, label: t(`status.booking.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('bookings.payment')}
              value={f('payment')}
              options={[
                all,
                ...PAYMENT_STATUSES.map((s) => ({
                  value: s,
                  label: t(`bookings.paymentStatus.${s}`),
                })),
              ]}
              onChange={(e) => list.setFilter('payment', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('bookings.bride')}
              value={f('bride')}
              options={[all, { value: 'true', label: t('bookings.brideOnly') }]}
              onChange={(e) => list.setFilter('bride', e.target.value ? [e.target.value] : [])}
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
        emptyTitle: t('bookings.empty'),
        onRowClick: (r) => void navigate(`${ROUTES.bookings}/${r.id}`),
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
