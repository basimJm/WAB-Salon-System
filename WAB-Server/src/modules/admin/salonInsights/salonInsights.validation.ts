import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { SALON_DELETION_DECISIONS } from '../../../constants/adminSalonInsights';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';
import { isLocalDate } from '../../../utils/time';

export const salonParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
/** Both ends inclusive; the service refuses a range longer than `SALON_ANALYTICS_MAX_DAYS`. */
export const analyticsQuery = z.object({
  from: z.string().refine(isLocalDate),
  to: z.string().refine(isLocalDate),
});
export const activityQuery = paginationQuery(ADMIN_PAGE_SIZE);
export const deletionDecisionBody = z.object({
  decision: z.enum(SALON_DELETION_DECISIONS),
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
