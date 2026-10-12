/** Domain enums (BUSINESS_DOMAIN.md §1). Each task adds the ones it needs. */
export const GENDERS = ['MALE', 'FEMALE'] as const;
/** Also the salon audience: MALE = men's salon, FEMALE = women's salon. */
export type Gender = (typeof GENDERS)[number];
