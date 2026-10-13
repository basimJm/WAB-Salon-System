/** Promotional banners (SRV-039, BUSINESS_DOMAIN.md §3.6). */
export const BANNERS_COLLECTION = 'banners';
export const BANNER_ACTIONS = ['NONE', 'SALON', 'EXTERNAL_URL'] as const;
export type BannerAction = (typeof BANNER_ACTIONS)[number];
export const BANNER_AUDIENCES = ['MALE', 'FEMALE', 'BOTH'] as const;
export type BannerAudience = (typeof BANNER_AUDIENCES)[number];
export const BANNER_AUDIENCE_BOTH: BannerAudience = 'BOTH';
export const BANNER_ROUTES = { base: '/banners' } as const;
export const ADMIN_BANNER_ROUTES = { base: '/banners' } as const;
export const BANNER_URL_MAX_LENGTH = 1_000;
