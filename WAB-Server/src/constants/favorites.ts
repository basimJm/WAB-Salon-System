/** Favorite salons (SRV-062, BUSINESS_DOMAIN.md §3.5 `favorites`, Customer PRD S20). */
export const FAVORITES_COLLECTION = 'favorites';
export const FAVORITE_ROUTES = { base: '/favorites', bySalon: '/:salonId' } as const;
