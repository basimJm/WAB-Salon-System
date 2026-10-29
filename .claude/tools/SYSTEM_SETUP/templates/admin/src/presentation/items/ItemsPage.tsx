import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { ITEM_SORT_KEYS, ITEM_STATUSES, type Item, type ItemInput } from '@/domain/items/items';
import { formatInstant } from '@/domain/shared/format';
import { ITEMS_STRINGS } from '@/locales/lazy/items';
import { Button } from '../components/core/Button';
import { StatusBadge } from '../components/core/StatusBadge';
import { ExportMenu } from '../components/data/ExportMenu';
import type { Column } from '../components/data/tableTypes';
import { SearchField } from '../components/form/SearchField';
import { Select } from '../components/form/Select';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useExportRunner } from '../hooks/useExportRunner';
import { useLanguage } from '../hooks/useLanguage';
import { useLazyStrings } from '../hooks/useLazyStrings';
import { useResourcePanel } from '../hooks/useResourcePanel';
import { ItemDrawer } from './ItemDrawer';
import { itemExportParams, itemQueryOf } from './itemFilters';

const OPTIONS = {
  filterKeys: ['status'],
  sortKeys: [...ITEM_SORT_KEYS],
  defaultSort: { key: 'createdAt', direction: 'desc' as const },
};

/** PRD P01 · Items: searchable, filterable, sortable list; create and edit in a side panel with a reason. */
export default function ItemsPage() {
  useLazyStrings(ITEMS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const repo = repositories.items;
  const list = useListController(OPTIONS);
  const { state } = list;
  const query = itemQueryOf(state);
  const runner = useExportRunner();
  const resource = useResourcePanel<Item, ItemInput>(state, {
    queryName: 'getItems',
    load: (s) => repo.list(itemQueryOf(s)),
    save: (editing, v, reason) =>
      editing ? repo.update(editing.id, v, reason) : repo.create(v, reason),
  });
  const data = resource.query.data;
  const title = t('nav.items');
  const status = query.status;
  const columns: Column<Item>[] = [
    {
      key: 'name',
      header: t('items.name'),
      sortable: true,
      render: (r) => <RouterLink to={`${ROUTES.items}/${r.id}`}>{r.name}</RouterLink>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (r) => <StatusBadge kind="item" value={r.status} />,
    },
    {
      key: 'updatedAt',
      header: t('items.updatedAt'),
      sortable: true,
      ltr: true,
      render: (r) => formatInstant(r.updatedAt, language, 'dateTime'),
    },
    {
      key: 'createdAt',
      header: t('items.createdAt'),
      sortable: true,
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('items.subtitle')}
        actions={<Button onClick={resource.openCreate}>{t('items.add')}</Button>}
        search={
          <SearchField
            label={t('items.search')}
            initialValue={state.search}
            onSearch={list.setSearch}
          />
        }
        exportMenu={<ExportMenu onExport={runner('ITEMS', itemExportParams(query))} />}
        filters={{
          active: status
            ? [
                {
                  key: 'status',
                  label: `${t('common.status')}: ${t(`status.item.${status}`)}`,
                  onRemove: () => list.setFilter('status', []),
                },
              ]
            : [],
          onClearAll: list.clearFilters,
          controls: (
            <Select
              label={t('common.status')}
              value={status ?? ''}
              options={[
                { value: '', label: t('common.all') },
                ...ITEM_STATUSES.map((s) => ({ value: s, label: t(`status.item.${s}`) })),
              ]}
              onChange={(e) => list.setFilter('status', e.target.value ? [e.target.value] : [])}
            />
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: resource.query.isPending,
          error: resource.query.error,
          onRetry: () => void resource.query.refetch(),
          emptyTitle: t('items.empty'),
          sort: state.sort ?? undefined,
          onSortChange: list.setSort,
          rowActions: (r) => (
            <Button variant="ghost" size="sm" onClick={() => resource.openEdit(r)}>
              {t('common.edit')}
            </Button>
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
      {resource.panel ? (
        <ItemDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          saving={resource.saving}
          error={resource.saveError}
          onSubmit={(v, reason) => resource.submit(v, reason)}
          onClose={resource.close}
        />
      ) : null}
    </>
  );
}
