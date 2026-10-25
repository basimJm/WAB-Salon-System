import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import {
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from '../../../constants/reviews';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
export const salonReviewParamsSchema = z.object({ salonId: objectId });
export const staffReviewParamsSchema = salonReviewParamsSchema.extend({ memberId: objectId });
export const reviewListQuerySchema = paginationQuery(APP_PAGE_SIZE);
export const submitReviewBodySchema = z.object({
  rating: z.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH).optional(),
  /** The branch the review is about (label only); staff reviews take the staff member's branch. */
  branchId: objectId.optional(),
});
