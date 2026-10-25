/** Working hours and exceptional closures (SRV-049, BUSINESS_DOMAIN.md §3.3, §5.3, Merchant PRD M15). */
export const CLOSURES_COLLECTION = 'salonClosures';
export const CLOSURE_REASON_MAX_LENGTH = 300;
export const MERCHANT_HOURS_ROUTES = {
  base: '/salon/hours',
  weekly: '/weekly',
  closures: '/closures',
  closureById: '/closures/:id',
  /** SRV-134: the bookings a change would break, before it is saved (nothing changes). */
  weeklyPreview: '/weekly/preview',
  closuresPreview: '/closures/preview',
} as const;
