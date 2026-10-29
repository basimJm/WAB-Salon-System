import type { CatalogServiceQuery } from '@/domain/catalog/catalog';
import {
  audienceFor,
  isAudience,
  type Audience,
  type BusinessKind,
  type BusinessType,
} from '@/domain/shared/businessType';
import type { ListState } from '@/domain/shared/listState';
import { BUSINESS_TYPE_FILTER_KEY, businessTypeFilterOf } from '../shared/businessFilter';

export const CATALOG_AUDIENCE_KEY = 'audience';
export const CATALOG_FILTER_KEYS = [BUSINESS_TYPE_FILTER_KEY, CATALOG_AUDIENCE_KEY];

/** The catalog is managed one business type at a time (§5.19); salons are shown first. */
const DEFAULT_TYPE: BusinessType = 'SALON';
/** A new salon service starts as a women's service unless an audience is chosen. */
const DEFAULT_SALON_AUDIENCE: Audience = 'FEMALE';

export interface CatalogKind {
  readonly businessType: BusinessType;
  /** Only salon services are filtered by audience; clinic services are all BOTH. */
  readonly audience: Audience | undefined;
  /** What the server is asked for. */
  readonly query: CatalogServiceQuery;
  /** Type + audience a new service starts with. */
  readonly forNew: BusinessKind;
}

/** The URL list state -> the catalog type shown, its audience filter and the defaults of a new service. */
export function catalogKindOf(state: ListState): CatalogKind {
  const businessType = businessTypeFilterOf(state) ?? DEFAULT_TYPE;
  const wanted = state.filters[CATALOG_AUDIENCE_KEY]?.[0];
  const audience = businessType === 'SALON' && isAudience(wanted) ? wanted : undefined;
  return {
    businessType,
    audience,
    query: { businessType, ...(audience ? { audience } : {}) },
    forNew: {
      businessType,
      audience: audienceFor(businessType, audience ?? DEFAULT_SALON_AUDIENCE),
    },
  };
}
