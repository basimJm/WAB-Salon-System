import { CUSTOMER_STATUSES, type CustomerQuery } from '@/domain/customers/customers';
import { SALON_GENDERS } from '@/domain/salons/salons';
import type { ListState } from '@/domain/shared/listState';

export const CUSTOMER_FILTER_KEYS = ['status', 'gender', 'city'];
const first = (state: ListState, key: string): string | undefined => state.filters[key]?.[0];

/** The URL list state -> the API query (values the server does not know are dropped). */
export function customerQueryOf(state: ListState): CustomerQuery {
  const status = CUSTOMER_STATUSES.find((s) => s === first(state, 'status'));
  const gender = SALON_GENDERS.find((g) => g === first(state, 'gender'));
  const city = first(state, 'city');
  return {
    page: state.page,
    pageSize: state.pageSize,
    ...(status ? { status } : {}),
    ...(gender ? { gender } : {}),
    ...(city ? { cityId: city } : {}),
    ...(state.search ? { q: state.search } : {}),
  };
}

/** What a CUSTOMERS export accepts (SRV-126): the list's status, gender, city and search, without the paging. */
export function customerExportParams(q: CustomerQuery): Record<string, unknown> {
  return {
    ...(q.status ? { status: q.status } : {}),
    ...(q.gender ? { gender: q.gender } : {}),
    ...(q.cityId ? { cityId: q.cityId } : {}),
    ...(q.q ? { q: q.q } : {}),
  };
}
