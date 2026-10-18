import type { ReactNode } from 'react';
import { DataTable, type DataTableProps } from '../data/DataTable';
import { FilterBar, type FilterBarProps } from '../data/FilterBar';
import { Pagination, type PaginationProps } from '../data/Pagination';
import { TableToolbar, type TableToolbarProps } from '../data/TableToolbar';
import { PageHeader } from '../core/PageHeader';

export interface ListPageProps<Row> {
  title: string;
  subtitle?: string;
  /** Buttons at the end of the header (create, import...). */
  actions?: ReactNode;
  /** Filter controls; omit for pages without filters. */
  filters?: Pick<FilterBarProps, 'active' | 'onClearAll'> & { controls: ReactNode };
  toolbar?: TableToolbarProps;
  table: DataTableProps<Row>;
  /** Hidden while loading the first page or when the list is empty or failed. */
  pagination?: PaginationProps;
}

/**
 * Every list screen: header, filter bar, bulk/tools toolbar, table (loading/empty/error built in) and server
 * pagination, in the same order and spacing. Pages fill the slots; they never lay a list out themselves.
 */
export function ListPage<Row>({
  title,
  subtitle,
  actions,
  filters,
  toolbar,
  table,
  pagination,
}: ListPageProps<Row>) {
  const showPagination =
    pagination !== undefined &&
    !table.loading &&
    (table.error === undefined || table.error === null) &&
    table.rows.length > 0;
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={title} {...(subtitle ? { subtitle } : {})} actions={actions} />
      {filters ? (
        <FilterBar active={filters.active} onClearAll={filters.onClearAll}>
          {filters.controls}
        </FilterBar>
      ) : null}
      {toolbar ? <TableToolbar {...toolbar} /> : null}
      <DataTable {...table} />
      {showPagination ? <Pagination {...pagination} /> : null}
    </div>
  );
}
