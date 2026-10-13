/** Salon services and catalog requests (SRV-050, BUSINESS_DOMAIN.md §3.3 salonServices, §3.2 catalogRequests). */
export const SALON_SERVICES_COLLECTION = 'salonServices';
export const CATALOG_REQUESTS_COLLECTION = 'catalogRequests';

export const SERVICE_DURATION_STEP_MIN = 5;
export const SERVICE_DURATION_MIN = 5;
/** Sanity bound (the domain sets none): a service never lasts longer than a day. */
export const SERVICE_DURATION_MAX = 1_440;
export const SERVICE_EXTRA_DESCRIPTION_MAX_LENGTH = 500;
/** Assumption (no limit in the domain): photos/videos shown with one salon service. */
export const SERVICE_MEDIA_MAX_ITEMS = 10;

export const CATALOG_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type CatalogRequestStatus = (typeof CATALOG_REQUEST_STATUSES)[number];
export const CATALOG_REQUEST_NAME_MAX_LENGTH = 100;
export const CATALOG_REQUEST_DESCRIPTION_MAX_LENGTH = 500;
export const CATALOG_REQUEST_NOTE_MAX_LENGTH = 1_000;

export const MERCHANT_SERVICES_ROUTES = { base: '/salon/services', byId: '/:id' } as const;
export const MERCHANT_CATALOG_REQUEST_ROUTES = { base: '/catalog/requests' } as const;
export const ADMIN_CATALOG_REQUEST_ROUTES = {
  base: '/catalog/requests',
  approve: '/:id/approve',
  reject: '/:id/reject',
} as const;
