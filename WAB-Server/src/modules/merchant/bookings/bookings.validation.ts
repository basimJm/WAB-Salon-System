import { z } from 'zod';
import { AVAILABILITY_MAX_OTHER_PICKS } from '../../../constants/availability';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import {
  CANCEL_AFFECTED_MAX_BOOKINGS,
  REASON_CODE_PATTERN,
  REASON_TEXT_MAX_LENGTH,
} from '../../../constants/bookings';

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

export const cancelAffectedBody = decisionBody.extend({
  bookingIds: z.array(z.string().regex(OBJECT_ID_PATTERN)).min(1).max(CANCEL_AFFECTED_MAX_BOOKINGS),
});
/** Which person of the booking (0 = the customer, then the companions). */
export const eligibleStaffQuery = z.object({
  personIndex: z.coerce.number().int().min(0).max(AVAILABILITY_MAX_OTHER_PICKS),
});
