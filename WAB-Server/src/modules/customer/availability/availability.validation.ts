import { z } from 'zod';
import {
  AVAILABILITY_MAX_OTHER_PICKS,
  AVAILABILITY_MAX_SERVICES,
} from '../../../constants/availability';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { isLocalDate } from '../../../utils/time';
import { instantInput } from '../../../utils/time/instantInput';
import { GENDERS } from '../../../constants/enums';

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
    /** The person's gender (§5.19): any at a BOTH salon or a clinic; must match a men's/women's salon. */
    gender: z.enum(GENDERS).optional(),
    /** Omit for "any available staff". */
    staffId: objectId.optional(),
  }),
  /** What the other persons of the same draft already picked: a busy interval each, so `start` and `end` are required (BUSINESS_DOMAIN §5.4 step 4). */
  others: z
    .array(
      z
        .object({ staffId: objectId, start: instantInput, end: instantInput })
        .refine((v) => v.end > v.start),
    )
    .max(AVAILABILITY_MAX_OTHER_PICKS)
    .default([]),
  draftId: objectId.optional(),
});
