/** Collections that carried a single gender before business types (BUSINESS_DOMAIN.md §5.19). */
export const BUSINESS_TYPE_MIGRATION_TARGETS = [
  'salons',
  'catalogServices',
  'recommendedPlacements',
  'bookings',
] as const;
export type BusinessTypeMigrationTarget = (typeof BUSINESS_TYPE_MIGRATION_TARGETS)[number];

/** Every business that existed before clinics was a salon. */
export const MIGRATED_BUSINESS_TYPE = 'SALON';

/** `npm run migrate:business-types -- --apply` writes; without the flag it only counts. */
export const MIGRATION_APPLY_FLAG = '--apply';
