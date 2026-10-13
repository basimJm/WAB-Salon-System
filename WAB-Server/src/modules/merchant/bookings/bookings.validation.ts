import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { REASON_CODE_PATTERN, REASON_TEXT_MAX_LENGTH } from '../../../constants/bookings';

export const bookingParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
/** Reject and salon cancellation carry a machine code and optional free text. */
export const decisionBody = z.object({
  reasonCode: z.string().regex(REASON_CODE_PATTERN),
  reasonText: z.string().trim().min(1).max(REASON_TEXT_MAX_LENGTH).optional(),
});

export const reassignBody = z.object({
  personIndex: z.number().int().min(0),
  staffId: z.string().regex(OBJECT_ID_PATTERN),
});
