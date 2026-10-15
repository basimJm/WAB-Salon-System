import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useContainer } from '@/app/ContainerContext';
import {
  SALON_GENDERS,
  SALON_STATES,
  type SalonGender,
  type SalonState,
  type SalonSummary,
} from '@/domain/salons/salons';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { StatusBadge } from '../components/core/StatusBadge';
import type { Column } from '../components/data/tableTypes';
import { SearchField } from '../components/form/SearchField';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { useQuery } from '@tanstack/react-query';

const OPTIONS = { filterKeys: ['state', 'gender', 'city'] };
const pick = <T extends string>(all: readonly T[], v: string | undefined): T | undefined =>
  all.find((a) => a === v);

/** Admin PRD A13 · All salons: state, gender, city, rating, subscription, created; filters and name search. */
export default function SalonsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const cities = useLocationOptions('cities');
  const salonState: SalonState | undefined = pick(SALON_STATES, state.filters['state']?.[0]);
  const gender: SalonGender | undefined = pick(SALON_GENDERS, state.filters['gender']?.[0]);
  const city = state.filters['city']?.[0];
  const query = useQuery({
    queryKey: ['getSalons', state],
    queryFn: () =>
      repositories.salons.list({
        page: state.page,
        pageSize: state.pageSize,
        ...(salonState ? { state: salonState } : {}),
        ...(gender ? { gender } : {}),
        ...(city ? { cityId: city } : {}),
        ...(state.search ? { q: state.search } : {}),
      }),
  });
  const cityName = (id: string | null) => cities.find((c) => c.value === id)?.label ?? '—';
  const title = t('nav.sub.allSalons');
  const columns: Column<SalonSummary>[] = [
    { key: 'name', header: t('salons.name'), render: (r) => r.name },
    { key: 'gender', header: t('salons.gender'), render: (r) => t(`catalog.genders.${r.gender}`) },
    { key: 'city', header: t('salons.city'), render: (r) => cityName(r.cityId) },
    {
      key: 'state',
      header: t('salons.state'),
      render: (r) => <StatusBadge kind="salon" value={r.state} />,
    },
    {
      key: 'rating',
      header: t('salons.rating'),
      ltr: true,
      render: (r) =>
        `${formatNumber(r.rating.avg, language)} (${formatNumber(r.rating.count, language)})`,
    },
    {
      key: 'sub',
      header: t('salons.subscription'),
      render: (r) =>
        r.subscriptionStatus ? (
          <StatusBadge kind="subscription" value={r.subscriptionStatus} />
        ) : (
          '—'
        ),
    },
    {
      key: 'created',
      header: t('salons.created'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'date'),
    },
  ];
  const chips = [
    ...(salonState
      ? [
          {
            key: 'state',
            label: `${t('salons.state')}: ${t(`status.salon.${salonState}`)}`,
            onRemove: () => list.setFilter('state', []),
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
      subtitle={t('salons.subtitle')}
      filters={{
        active: chips,
        onClearAll: list.clearFilters,
        controls: (
          <>
            <SearchField
              label={t('salons.search')}
              initialValue={state.search}
              onSearch={list.setSearch}
            />
            <Select
              label={t('salons.state')}
              value={salonState ?? ''}
              options={[
                all,
                ...SALON_STATES.map((s) => ({ value: s, label: t(`status.salon.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('state', e.target.value ? [e.target.value] : [])}
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
        emptyTitle: t('salons.empty'),
        onRowClick: (r) => void navigate(`${ROUTES.salons}/${r.id}`),
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
