import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Page } from '@/domain/shared/page';
import type { ListState } from '@/domain/shared/listState';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { ActiveFilter } from '../components/data/FilterBar';
import type { Column } from '../components/data/tableTypes';
import { ListPage } from '../components/templates/ListPage';
import { useLanguage } from '../hooks/useLanguage';
import type { ListController } from '../controllers/useListController';

interface Named {
  id: string;
  name: { ar: string; en: string };
  active: boolean;
  sortOrder: number;
}

export interface LocationsTableProps<T extends Named> {
  title: string;
  list: ListController;
  state: ListState;
  /** Columns after the name (code, parent...). */
  extraColumns: Column<T>[];
  query: { data: Page<T> | undefined; isPending: boolean; error: unknown; refetch: () => unknown };
  filter?: { controls: ReactNode; active: ActiveFilter[] };
  onCreate: () => void;
  onEdit: (row: T) => void;
}

/** The list screen of one location kind: name in both languages, extra columns, active badge, edit, server paging. */
export function LocationsTable<T extends Named>({
  title,
  list,
  state,
  extraColumns,
  query,
  filter,
  onCreate,
  onEdit,
}: LocationsTableProps<T>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const other = language === 'ar' ? 'en' : 'ar';
  const columns: Column<T>[] = [
    {
      key: 'name',
      header: t('locations.name'),
      render: (r) => (
        <span>
          {r.name[language]} <span className="wab-muted">· {r.name[other]}</span>
        </span>
      ),
    },
    ...extraColumns,
    {
      key: 'sortOrder',
      header: t('locations.sortOrder'),
      ltr: true,
      render: (r) => r.sortOrder,
    },
    {
      key: 'active',
      header: t('locations.status'),
      render: (r) => (
        <Badge tone={r.active ? 'green' : 'grey'}>
          {t(r.active ? 'locations.active' : 'locations.inactive')}
        </Badge>
      ),
    },
  ];
  const meta = query.data;
  return (
    <ListPage
      title={title}
      subtitle={t('locations.subtitle')}
      actions={<Button onClick={onCreate}>{t('locations.add')}</Button>}
      filters={
        filter
          ? { controls: filter.controls, active: filter.active, onClearAll: list.clearFilters }
          : undefined
      }
      table={{
        columns,
        rows: meta?.items ?? [],
        rowKey: (r) => r.id,
        caption: title,
        loading: query.isPending,
        error: query.error,
        onRetry: () => void query.refetch(),
        rowActions: (r) => (
          <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
            {t('locations.edit')}
          </Button>
        ),
      }}
      pagination={
        meta
          ? {
              page: state.page,
              pageSize: state.pageSize,
              total: meta.meta.total,
              onPageChange: list.setPage,
              onPageSizeChange: list.setPageSize,
              ariaLabel: title,
            }
          : undefined
      }
    />
  );
}
