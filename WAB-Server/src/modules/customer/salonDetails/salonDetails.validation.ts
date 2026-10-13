import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

export const salonParamsSchema = z.object({ salonId: z.string().regex(OBJECT_ID_PATTERN) });
export const staffParamsSchema = salonParamsSchema.extend({
  memberId: z.string().regex(OBJECT_ID_PATTERN),
});
