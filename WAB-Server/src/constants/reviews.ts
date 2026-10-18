/** Reviews (SRV-063, BUSINESS_DOMAIN.md §3.6 `reviews`, §5.11, Customer PRD S07-S09). */
export const REVIEWS_COLLECTION = 'reviews';
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 1000;
/** The salon page shows this many latest reviews before "See all". */
export const REVIEW_PREVIEW_COUNT = 3;
export const REVIEW_ROUTES = {
  salon: '/:salonId/reviews',
  staff: '/:salonId/staff/:memberId/reviews',
} as const;
/** Ratings are stored with one decimal place (BUSINESS_DOMAIN.md §3.3, §5.11). */
export const RATING_DECIMAL_SCALE = 10;
/** Admin moderation (A22). */
export const ADMIN_REVIEW_ROUTES = {
  base: '/reviews',
  approve: '/:id/approve',
  reject: '/:id/reject',
  remove: '/:id/remove',
  bulk: '/bulk',
} as const;
export const REVIEW_BULK_MAX = 100;
/** Approve and reject may omit the reason (Admin PRD A22); the audit log still records one. */
export const REVIEW_DEFAULT_REASONS = {
  approve: 'Review approved',
  reject: 'Review rejected',
} as const;
