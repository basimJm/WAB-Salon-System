/** Public reference-data lists (SRV-036, BUSINESS_DOMAIN.md §3.2). */
export const LOCATION_ROUTES = {
  base: '/locations',
  countries: '/countries',
  cities: '/cities',
  areas: '/areas',
} as const;

/** Sort used by every list: admin-defined order first. */
export const LOCATION_SORT = { sortOrder: 1 } as const;
