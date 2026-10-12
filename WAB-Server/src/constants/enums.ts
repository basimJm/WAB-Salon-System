/** Domain enums (BUSINESS_DOMAIN.md §1). Each task adds the ones it needs. */
export const GENDERS = ['MALE', 'FEMALE'] as const;
/** Also the salon audience: MALE = men's salon, FEMALE = women's salon. */
export type Gender = (typeof GENDERS)[number];

/** Who performed an action (BUSINESS_DOMAIN.md §1 `ActorType`). */
export const ACTOR_TYPES = ['CUSTOMER', 'MEMBER', 'ADMIN', 'SYSTEM'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

/** Client platform (BUSINESS_DOMAIN.md §1 `Platform`). */
export const PLATFORMS = ['ANDROID', 'IOS', 'WEB'] as const;
export type Platform = (typeof PLATFORMS)[number];
