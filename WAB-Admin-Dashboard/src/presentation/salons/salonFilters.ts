import {
  SALON_GENDERS,
  SALON_STATES,
  SUBSCRIPTION_STATUSES,
  type SalonQuery,
} from '@/domain/salons/salons';
import type { ListState } from '@/domain/shared/listState';

export const SALON_FILTER_KEYS = [
  'state',
  'gender',
  'city',
  'subscription',
  'recommended',
  'deletion',
];
const first = (state: ListState, key: string): string | undefined => state.filters[key]?.[0];

/** The URL list state -> the API query (values the server does not know are dropped). */
export function salonQueryOf(state: ListState): SalonQuery {
  const salonState = SALON_STATES.find((s) => s === first(state, 'state'));
  const gender = SALON_GENDERS.find((g) => g === first(state, 'gender'));
  const subscription = SUBSCRIPTION_STATUSES.find((s) => s === first(state, 'subscription'));
  const recommended = first(state, 'recommended');
  const city = first(state, 'city');
  return {
    page: state.page,
    pageSize: state.pageSize,
    ...(salonState ? { state: salonState } : {}),
    ...(gender ? { gender } : {}),
    ...(city ? { cityId: city } : {}),
    ...(subscription ? { subscription } : {}),
    ...(recommended === 'true' || recommended === 'false'
      ? { recommended: recommended === 'true' }
      : {}),
    ...(first(state, 'deletion') === 'true' ? { deletionRequested: true } : {}),
    ...(state.search ? { q: state.search } : {}),
  };
}
