import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { CUSTOMER_STATUSES, type CustomerSummary } from '@/domain/customers/customers';
import { SALON_GENDERS } from '@/domain/salons/salons';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { StatusBadge } from '../components/core/StatusBadge';
import { ExportMenu } from '../components/data/ExportMenu';
import type { Column } from '../components/data/tableTypes';
import { SearchField } from '../components/form/SearchField';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useExportRunner } from '../hooks/useExportRunner';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { CUSTOMER_FILTER_KEYS, customerExportParams, customerQueryOf } from './customerFilters';

const OPTIONS = { filterKeys: CUSTOMER_FILTER_KEYS };

/** Admin PRD A12 · Customers: search by name or phone, filters, status, bookings and last activity. */
export default function CustomersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const cities = useLocationOptions('cities');
  const runner = useExportRunner();
  const apiQuery = customerQueryOf(state);
  const { status, gender, cityId: city } = apiQuery;
  const query = useQuery({
    queryKey: ['getCustomers', state],
    queryFn: () => repositories.customers.list(apiQuery),
  });
  const cityName = (id: string) => cities.find((c) => c.value === id)?.label ?? '—';
  const title = t('nav.customers');
  const columns: Column<CustomerSummary>[] = [
    { key: 'name', header: t('customers.name'), render: (r) => r.name },
    { key: 'phone', header: t('salons.phone'), ltr: true, render: (r) => r.phone },
    { key: 'gender', header: t('salons.gender'), render: (r) => t(`catalog.genders.${r.gender}`) },
    { key: 'city', header: t('salons.city'), render: (r) => cityName(r.cityId) },
    {
      key: 'registered',
      header: t('customers.registered'),
      ltr: true,
      render: (r) => formatInstant(r.registeredAt, language, 'date'),
    },
    {
      key: 'last',
      header: t('customers.lastActive'),
      ltr: true,
      render: (r) => (r.lastActiveAt ? formatInstant(r.lastActiveAt, language, 'date') : '—'),
    },
    {
      key: 'bookings',
      header: t('customers.bookings'),
      ltr: true,
      render: (r) => formatNumber(r.bookingsCount, language),
    },
    {
      key: 'status',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="customer" value={r.status} />,
    },
  ];
  const chips = [
    ...(status
      ? [
          {
            key: 'status',
            label: `${t('salons.state')}: ${t(`status.customer.${status}`)}`,
            onRemove: () => list.setFilter('status', []),
          },
        ]
      : []),
    ...(gender
      ? [
          {
            key: 'gender',
            label: `${t('salons.gender')}: ${t(`catalog.genders.${gender}`)}`,
            onRemove: () => list.setFilter('gender', []),
          },
        ]
      : []),
    ...(city
      ? [
          {
            key: 'city',
            label: `${t('salons.city')}: ${cityName(city)}`,
            onRemove: () => list.setFilter('city', []),
          },
        ]
      : []),
  ];
  const all = { value: '', label: t('appConfig.all') };
  const data = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('customers.subtitle')}
      actions={<ExportMenu onExport={runner('CUSTOMERS', customerExportParams(apiQuery))} />}
      filters={{
        active: chips,
        onClearAll: list.clearFilters,
        controls: (
          <>
            <SearchField
              label={t('customers.search')}
              initialValue={state.search}
              onSearch={list.setSearch}
            />
            <Select
              label={t('salons.state')}
              value={status ?? ''}
              options={[
                all,
                ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: t(`status.customer.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('salons.gender')}
              value={gender ?? ''}
              options={[
                all,
                ...SALON_GENDERS.map((g) => ({ value: g, label: t(`catalog.genders.${g}`) })),
              ]}
              onChange={(e) => list.setFilter('gender', e.target.value ? [e.target.value] : [])}
            />
            <Select
              label={t('salons.city')}
              value={city ?? ''}
              options={[all, ...cities]}
              onChange={(e) => list.setFilter('city', e.target.value ? [e.target.value] : [])}
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
        emptyTitle: t('customers.empty'),
        onRowClick: (r) => void navigate(`${ROUTES.customers}/${r.id}`),
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
