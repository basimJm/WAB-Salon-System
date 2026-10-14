/** Shared shape of the admin CRUD resources (SRV-038). */
export const ADMIN_CRUD_ROUTES = { list: '/', byId: '/:id' } as const;
export const ADMIN_CRUD_VERBS = { create: 'CREATE', update: 'UPDATE' } as const;
export const ADMIN_LOCATION_ROUTES = {
  base: '/locations',
  countries: '/countries',
  cities: '/cities',
  areas: '/areas',
} as const;
export const LOCALIZED_TEXT_MAX_LENGTH = 200;
export const SORT_ORDER_MAX = 100_000;
