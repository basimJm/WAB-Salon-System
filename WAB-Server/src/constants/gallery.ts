/** Salon gallery (SRV-048, BUSINESS_DOMAIN.md §3.3 `galleryItems`, Merchant PRD M14). */
export const GALLERY_COLLECTION = 'galleryItems';
export const GALLERY_TYPES = ['IMAGE', 'VIDEO'] as const;
export type GalleryType = (typeof GALLERY_TYPES)[number];
/** Assumption (no limit in the domain): a portfolio of at most this many items per salon. */
export const GALLERY_MAX_ITEMS = 100;
export const MERCHANT_GALLERY_ROUTES = {
  base: '/salon/gallery',
  order: '/order',
  byId: '/:id',
} as const;
