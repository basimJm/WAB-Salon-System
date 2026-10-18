import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { ADMIN_PAGE_SIZE } from '../../../constants/pagination';
import { SALON_STATES } from '../../../constants/salon';
import { paginationQuery } from '../../../utils/pagination';

export const applicationsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  state: z.enum(SALON_STATES).optional(),
});
export const applicationParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
/** Approving or rejecting always carries a reason (CLAUDE.md §5.12); the owner sees it on rejection. */
export const decisionBody = z.object({
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
