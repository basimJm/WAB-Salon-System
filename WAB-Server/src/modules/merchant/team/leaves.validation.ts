import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { LEAVE_NOTE_MAX_LENGTH } from '../../../constants/leaves';
import { isLocalDate } from '../../../utils/time';

const date = z.string().refine(isLocalDate);
const note = z.string().trim().max(LEAVE_NOTE_MAX_LENGTH);

export const leaveSchema = z.object({ from: date, to: date, note: note.optional() });
/** Just the days, for a preview of the bookings a leave would break. */
export const leaveRangeSchema = z.object({ from: date, to: date });
export const leavePatchSchema = z
  .object({ from: date, to: date, note: note.nullable() })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });
export const memberLeaveParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const leaveParams = memberLeaveParams.extend({
  leaveId: z.string().regex(OBJECT_ID_PATTERN),
});
