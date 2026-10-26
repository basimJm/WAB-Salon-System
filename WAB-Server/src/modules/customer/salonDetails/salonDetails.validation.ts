import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

export const salonParamsSchema = z.object({ salonId: z.string().regex(OBJECT_ID_PATTERN) });
export const staffParamsSchema = salonParamsSchema.extend({
  memberId: z.string().regex(OBJECT_ID_PATTERN),
});
/** Optional branch selection (§5.17/§5.18): staff and services of that branch only. */
export const salonQuerySchema = z.object({
  branchId: z.string().regex(OBJECT_ID_PATTERN).optional(),
});
