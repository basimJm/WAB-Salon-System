import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SKELETON_ROWS } from '@/constants/ui';
import { cx } from '../../utils/cx';
import { Icon } from '../core/Icon';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorState } from '../feedback/ErrorState';
import { Skeleton } from '../feedback/Skeleton';

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  sortable?: boolean;
  /** Numeric/ID cells stay left-to-right inside RTL pages. */
  ltr?: boolean;
}

export interface DataTableProps<Row> {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  caption: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  sort?: SortState | undefined;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: Row) => void;
  emptyTitle?: string;
}

const nextDirection = (current: SortState | undefined, key: string): SortDirection =>
  current?.key === key && current.direction === 'asc' ? 'desc' : 'asc';

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error,
  onRetry,
  sort,
  onSortChange,
  onRowClick,
  emptyTitle,
}: DataTableProps<Row>) {
  const { t } = useTranslation();
  if (error !== undefined && error !== null)
    return <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />;
  if (!loading && rows.length === 0) return <EmptyState title={emptyTitle ?? t('table.empty')} />;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable
    <div className="wab-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="wab-table" aria-busy={loading || undefined}>
        <caption className="wab-sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sort?.key === c.key ? sort.direction : undefined;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                  }
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="wab-table__sort"
                      onClick={() =>
                        onSortChange({ key: c.key, direction: nextDirection(sort, c.key) })
                      }
                    >
                      {c.header}
                      {sorted ? (
                        <Icon name={sorted === 'asc' ? 'sortUp' : 'sortDown'} size="sm" />
                      ) : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <Skeleton width="half" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cx(onRowClick && 'wab-table__row--click')}
                  {...(onRowClick
                    ? {
                        onClick: () => onRowClick(row),
                        tabIndex: 0,
                        onKeyDown: (e) => {
                          if (e.key === 'Enter') onRowClick(row);
                        },
                      }
                    : {})}
                >
                  {columns.map((c) => (
                    <td key={c.key} dir={c.ltr ? 'ltr' : undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
