import { SALON_STATES, SUBSCRIPTION_STATUSES, type SalonQuery } from '@/domain/salons/salons';
import { AUDIENCES } from '@/domain/shared/businessType';
import type { ListState } from '@/domain/shared/listState';
import {
  BUSINESS_TYPE_FILTER_KEY,
  businessTypeFilterOf,
  businessTypeParam,
} from '../shared/businessFilter';

export const SALON_FILTER_KEYS = [
  'state',
  BUSINESS_TYPE_FILTER_KEY,
  'audience',
  'city',
  'subscription',
  'recommended',
  'deletion',
];
const first = (state: ListState, key: string): string | undefined => state.filters[key]?.[0];

/** The URL list state -> the API query (values the server does not know are dropped). */
export function salonQueryOf(state: ListState): SalonQuery {
  const salonState = SALON_STATES.find((s) => s === first(state, 'state'));
  const audience = AUDIENCES.find((a) => a === first(state, 'audience'));
  const subscription = SUBSCRIPTION_STATUSES.find((s) => s === first(state, 'subscription'));
  const recommended = first(state, 'recommended');
  const city = first(state, 'city');
  return {
    page: state.page,
    pageSize: state.pageSize,
    ...(salonState ? { state: salonState } : {}),
    ...businessTypeParam(businessTypeFilterOf(state)),
    ...(audience ? { audience } : {}),
    ...(city ? { cityId: city } : {}),
    ...(subscription ? { subscription } : {}),
    ...(recommended === 'true' || recommended === 'false'
      ? { recommended: recommended === 'true' }
      : {}),
    ...(first(state, 'deletion') === 'true' ? { deletionRequested: true } : {}),
    ...(state.search ? { q: state.search } : {}),
  };
}

/**
 * What a SALONS export accepts (SRV-126, SRV-178): state, business type, audience, city, subscription and search. The recommended and
 * deletion-request switches have no export parameter, so the file holds every salon matching the other filters.
 */
export function salonExportParams(q: SalonQuery): Record<string, unknown> {
  return {
    ...(q.state ? { state: q.state } : {}),
    ...businessTypeParam(q.businessType),
    ...(q.audience ? { audience: q.audience } : {}),
    ...(q.cityId ? { cityId: q.cityId } : {}),
    ...(q.subscription ? { subscription: q.subscription } : {}),
    ...(q.q ? { q: q.q } : {}),
  };
}
