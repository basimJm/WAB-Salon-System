import { z } from 'zod';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

export const salonParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
/** Admin actions always carry a reason (CLAUDE.md §5.12). */
export const reasonBody = z.object({
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
