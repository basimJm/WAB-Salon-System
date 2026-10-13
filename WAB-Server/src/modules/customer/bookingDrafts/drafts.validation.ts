import { z } from 'zod';
import {
  BOOKING_PERSON_NAME_MAX_LENGTH,
  BOOKING_PERSON_NAME_MIN_LENGTH,
} from '../../../constants/bookingDrafts';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { PAYMENT_OPTIONS } from '../../../constants/salon';
import { AVAILABILITY_MAX_SERVICES } from '../../../constants/availability';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
/** Main person + `booking.maxCompanions` is enforced by the service from settings; this is a sanity cap. */
const MAX_PERSONS_SANITY = 20;

export const draftParams = z.object({ id: objectId });
export const createDraftBody = z.object({
  salonId: objectId,
  paymentMethod: z.enum(PAYMENT_OPTIONS),
  /** The first person is the account holder (or the bride they book for); the rest are companions. */
  persons: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(BOOKING_PERSON_NAME_MIN_LENGTH)
          .max(BOOKING_PERSON_NAME_MAX_LENGTH),
        isBride: z.boolean().default(false),
        /** Salon service ids. */
        serviceIds: z.array(objectId).min(1).max(AVAILABILITY_MAX_SERVICES),
        /** Omit for "any available staff". */
        staffId: objectId.optional(),
        /** Slot start (ISO instant); must be a slot returned by the availability endpoint. */
        start: z.coerce.date(),
      }),
    )
    .min(1)
    .max(MAX_PERSONS_SANITY),
});
