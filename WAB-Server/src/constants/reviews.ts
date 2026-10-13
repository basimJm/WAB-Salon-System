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
