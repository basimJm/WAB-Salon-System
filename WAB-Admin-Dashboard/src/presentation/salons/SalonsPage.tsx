import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { SALON_GENDERS, SALON_STATES, SUBSCRIPTION_STATUSES } from '@/domain/salons/salons';
import { ExportMenu } from '../components/data/ExportMenu';
import { SearchField } from '../components/form/SearchField';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useExportRunner } from '../hooks/useExportRunner';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { salonColumns } from './SalonColumns';
import { SALON_FILTER_KEYS, salonExportParams, salonQueryOf } from './salonFilters';

const OPTIONS = { filterKeys: SALON_FILTER_KEYS };

/** Admin PRD A13 · All salons: state, gender, city, rating, subscription, recommended, bookings, created; filters and search. */
export default function SalonsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const cities = useLocationOptions('cities');
  const runner = useExportRunner();
  const f = (key: string) => state.filters[key]?.[0] ?? '';
  const query = useQuery({
    queryKey: ['getSalons', state],
    queryFn: () => repositories.salons.list(salonQueryOf(state)),
  });
  const cityName = (id: string | null) => cities.find((c) => c.value === id)?.label ?? '—';
  const title = t('nav.sub.allSalons');
  const all = { value: '', label: t('appConfig.all') };
  const yesNo = [
    all,
    { value: 'true', label: t('salons.yes') },
    { value: 'false', label: t('salons.no') },
  ];
  const chip = (key: string, label: string, value: string) =>
    value ? [{ key, label: `${label}: ${value}`, onRemove: () => list.setFilter(key, []) }] : [];
  const chips = [
    ...chip(
      'state',
      t('salons.state'),
      f('state') && t(`status.salon.${f('state')}`, { defaultValue: f('state') }),
    ),
    ...chip(
      'gender',
      t('salons.gender'),
      f('gender') && t(`catalog.genders.${f('gender')}`, { defaultValue: f('gender') }),
    ),
    ...chip('city', t('salons.city'), f('city') && cityName(f('city'))),
    ...chip(
      'subscription',
      t('salons.subscription'),
      f('subscription') &&
        t(`status.subscription.${f('subscription')}`, { defaultValue: f('subscription') }),
    ),
    ...chip(
      'recommended',
      t('salons.recommended'),
      f('recommended') && t(f('recommended') === 'true' ? 'salons.yes' : 'salons.no'),
    ),
    ...chip('deletion', t('salons.deletionAsked'), f('deletion') && t('salons.yes')),
  ];
  const select = (
    key: string,
    label: string,
    options: readonly { value: string; label: string }[],
  ) => (
    <Select
      label={label}
      value={f(key)}
      options={options}
      onChange={(e) => list.setFilter(key, e.target.value ? [e.target.value] : [])}
    />
  );
  const data = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('salons.subtitle')}
      exportMenu={
        <ExportMenu onExport={runner('SALONS', salonExportParams(salonQueryOf(state)))} />
      }
      search={
        <SearchField
          label={t('salons.search')}
          initialValue={state.search}
          onSearch={list.setSearch}
        />
      }
      filters={{
        active: chips,
        onClearAll: list.clearFilters,
        controls: (
          <>
            {select('state', t('salons.state'), [
              all,
              ...SALON_STATES.map((s) => ({ value: s, label: t(`status.salon.${s}`) })),
            ])}
            {select('gender', t('salons.gender'), [
              all,
              ...SALON_GENDERS.map((g) => ({ value: g, label: t(`catalog.genders.${g}`) })),
            ])}
            {select('city', t('salons.city'), [all, ...cities])}
            {select('subscription', t('salons.subscription'), [
              all,
              ...SUBSCRIPTION_STATUSES.map((s) => ({
                value: s,
                label: t(`status.subscription.${s}`),
              })),
            ])}
            {select('recommended', t('salons.recommended'), yesNo)}
            {select('deletion', t('salons.deletionAsked'), [
              all,
              { value: 'true', label: t('salons.yes') },
            ])}
          </>
        ),
      }}
      table={{
        columns: salonColumns(t, language, cityName),
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
