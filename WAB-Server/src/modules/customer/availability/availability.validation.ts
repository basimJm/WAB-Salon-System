import { z } from 'zod';
import {
  AVAILABILITY_MAX_OTHER_PICKS,
  AVAILABILITY_MAX_SERVICES,
} from '../../../constants/availability';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { isLocalDate } from '../../../utils/time';

const objectId = z.string().regex(OBJECT_ID_PATTERN);

export const availabilityParams = z.object({ salonId: objectId });
export const availabilityBody = z.object({
  /** The branch picked at step 1 (§5.18); omit only when the salon has one bookable branch. */
  branchId: objectId.optional(),
  /** Salon-local calendar date, `YYYY-MM-DD`. */
  date: z.string().refine((v) => isLocalDate(v)),
  person: z.object({
    serviceIds: z.array(objectId).min(1).max(AVAILABILITY_MAX_SERVICES),
    isBride: z.boolean().default(false),
    /** Omit for "any available staff". */
    staffId: objectId.optional(),
  }),
  /** What the other persons of the same draft already picked. */
  others: z
    .array(
      z
        .object({ staffId: objectId, start: z.coerce.date(), end: z.coerce.date() })
        .refine((v) => v.end > v.start),
    )
    .max(AVAILABILITY_MAX_OTHER_PICKS)
    .default([]),
  draftId: objectId.optional(),
});
