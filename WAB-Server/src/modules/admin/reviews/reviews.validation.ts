import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { REVIEW_STATUSES, REVIEW_TARGETS } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { REVIEW_BULK_MAX, REVIEW_RATING_MAX, REVIEW_RATING_MIN } from '../../../constants/reviews';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);

export const adminReviewsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  target: z.enum(REVIEW_TARGETS).optional(),
  salonId: objectId.optional(),
  staffId: objectId.optional(),
  rating: z.coerce.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX).optional(),
});
export const reviewIdParams = z.object({ id: objectId });
/** Approve and reject may leave the reason out (Admin PRD A22). */
export const optionalReasonBody = z.object({ reason: reason.optional() });
/** Taking a published review down always needs a reason (CLAUDE.md §5.12). */
export const removeBody = z.object({ reason });
export const bulkBody = z.object({
  ids: z.array(objectId).min(1).max(REVIEW_BULK_MAX),
  decision: z.enum(['approve', 'reject']),
  reason: reason.optional(),
});
