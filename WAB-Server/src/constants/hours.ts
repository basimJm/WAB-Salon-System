/** Working hours and exceptional closures (SRV-049, BUSINESS_DOMAIN.md §3.3, §5.3, Merchant PRD M15). */
export const CLOSURES_COLLECTION = 'salonClosures';
export const CLOSURE_REASON_MAX_LENGTH = 300;
export const MERCHANT_HOURS_ROUTES = {
  base: '/salon/hours',
  weekly: '/weekly',
  closures: '/closures',
  closureById: '/closures/:id',
} as const;
