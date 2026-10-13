import { z } from 'zod';
import { REASON_TEXT_MAX_LENGTH } from '../../../constants/bookings';
import { BOOKING_STATUSES } from '../../../constants/enums';

export const statusChangeBody = z.object({
  status: z.enum(BOOKING_STATUSES),
  /** Mandatory for every admin action (CLAUDE.md §5.12). */
  reason: z.string().trim().min(1).max(REASON_TEXT_MAX_LENGTH),
});
