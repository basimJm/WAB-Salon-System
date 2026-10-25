import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { REFUND_STATUSES } from '../../../constants/providers';
import { MANUAL_REFERENCE_MAX_LENGTH } from '../../../constants/refunds';
import { paginationQuery } from '../../../utils/pagination';

const reason = z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH);
export const refundsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  status: z.enum(REFUND_STATUSES).optional(),
  bookingId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  salonId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  branchId: z.string().regex(OBJECT_ID_PATTERN).optional(),
});
export const refundParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const retryBody = z.object({ reason });
export const manualBody = z.object({
  reference: z.string().trim().min(1).max(MANUAL_REFERENCE_MAX_LENGTH),
  reason,
});
