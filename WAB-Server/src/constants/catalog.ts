/** Service catalog routes (SRV-040, BUSINESS_DOMAIN.md §3.2 `catalogServices`). */
export const CATALOG_ROUTES = { base: '/catalog', services: '/services' } as const;
export const ADMIN_CATALOG_ROUTES = { base: '/catalog/services' } as const;
export const CATALOG_TEXT_MAX_LENGTH = 500;
