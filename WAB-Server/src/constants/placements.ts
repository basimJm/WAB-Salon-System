/** Recommended-salon placements (SRV-066, BUSINESS_DOMAIN.md §3.6 `recommendedPlacements`, §5.13, Admin PRD A20). */
export const PLACEMENTS_COLLECTION = 'recommendedPlacements';
export const PLACEMENT_STATUSES = ['SCHEDULED', 'ACTIVE', 'ENDED'] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];
export const PLACEMENT_NOTE_MAX_LENGTH = 500;
export const PLACEMENT_REORDER_MAX = 200;
export const ADMIN_PLACEMENT_ROUTES = {
  base: '/recommended',
  byId: '/:id',
  end: '/:id/end',
  reorder: '/reorder',
} as const;
