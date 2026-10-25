import { z } from '../../../docs/zod';

/** An upcoming booking a schedule, closure, staff or leave change would break (§5.12). */
export const bookingConflictDoc = z.object({
  bookingId: z.string(),
  startsAt: z.iso.datetime(),
  status: z.string(),
});
