import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { CLOSURE_REASON_MAX_LENGTH } from '../../../constants/hours';
import { SCHEDULE_DAY_ORDER } from '../../../constants/salon';
import { DAYS_OF_WEEK } from '../../../constants/time';
import { isHHmm, isLocalDate } from '../../../utils/time';

const hhmm = z.string().refine(isHHmm);
const date = z.string().refine(isLocalDate);
const reason = z.string().trim().min(1).max(CLOSURE_REASON_MAX_LENGTH);

/** All seven days, each once; the server stores them Saturday to Friday. */
export const weeklySchema = z.object({
  days: z
    .array(z.object({ day: z.enum(DAYS_OF_WEEK), isOff: z.boolean(), open: hhmm, close: hhmm }))
    .length(SCHEDULE_DAY_ORDER.length),
});
export const closureSchema = z.object({ from: date, to: date, reason });
export const closurePatchSchema = z
  .object({ from: date, to: date, reason })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });
export const closureParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
