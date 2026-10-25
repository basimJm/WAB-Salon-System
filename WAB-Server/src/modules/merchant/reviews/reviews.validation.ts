import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { REVIEW_TARGETS } from '../../../constants/enums';
import { APP_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';

const objectId = z.string().regex(OBJECT_ID_PATTERN);

/** M20 tabs: salon reviews, or one staff member's (`memberId` required for STAFF). */
export const merchantReviewsQuery = paginationQuery(APP_PAGE_SIZE)
  .extend({
    target: z.enum(REVIEW_TARGETS).default('SALON'),
    memberId: objectId.optional(),
    /** Owner only: one branch (a branch member always sees their own branch). */
    branchId: objectId.optional(),
  })
  .refine((q) => q.target !== 'STAFF' || q.memberId !== undefined, {
    path: ['memberId'],
    message: 'memberId is required for staff reviews',
  });
