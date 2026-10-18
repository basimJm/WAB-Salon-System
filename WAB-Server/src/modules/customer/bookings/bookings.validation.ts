import { z } from 'zod';
import { REASON_TEXT_MAX_LENGTH } from '../../../constants/bookings';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

export const createBookingBody = z.object({ draftId: z.string().regex(OBJECT_ID_PATTERN) });

export const bookingIdParams = z.object({ id: z.string().regex(OBJECT_ID_PATTERN) });
export const cancelBookingBody = z.object({
  reasonText: z.string().trim().min(1).max(REASON_TEXT_MAX_LENGTH).optional(),
});
