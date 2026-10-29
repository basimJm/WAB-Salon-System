import { isBusinessType, type BusinessType } from '@/domain/shared/businessType';
import type { ListState } from '@/domain/shared/listState';

/** URL filter key of the All / Salons / Clinics switch shared by every business list (BUSINESS_DOMAIN §5.19). */
export const BUSINESS_TYPE_FILTER_KEY = 'type';

/** The business type the list is filtered by; anything the server does not know means "all". */
export const businessTypeFilterOf = (state: ListState): BusinessType | undefined => {
  const value = state.filters[BUSINESS_TYPE_FILTER_KEY]?.[0];
  return isBusinessType(value) ? value : undefined;
};

/** `{ businessType }` for an API query or an export, or nothing when the list shows every type. */
export const businessTypeParam = (
  type: BusinessType | undefined,
): { businessType?: BusinessType } => (type ? { businessType: type } : {});
