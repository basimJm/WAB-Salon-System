import { isItemSortKey, isItemStatus, sortParamOf, type ItemsQuery } from '@/domain/items/items';
import type { ListState } from '@/domain/shared/listState';

/** URL list state -> the query the repository takes; unknown values are dropped, never sent. */
export function itemQueryOf(state: ListState): ItemsQuery {
  const status = state.filters['status']?.[0];
  const sortKey = state.sort?.key;
  return {
    page: state.page,
    pageSize: state.pageSize,
    ...(state.search ? { q: state.search } : {}),
    ...(isItemStatus(status) ? { status } : {}),
    ...(state.sort && isItemSortKey(sortKey)
      ? { sort: { key: sortKey, direction: state.sort.direction } }
      : {}),
  };
}

/** The same filters as export parameters (`POST /exports` kind ITEMS): no paging, no sort. */
export function itemExportParams(query: ItemsQuery): Record<string, unknown> {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { q: query.q } : {}),
  };
}

export const itemSortParam = (query: ItemsQuery): string | undefined =>
  query.sort ? sortParamOf(query.sort) : undefined;
