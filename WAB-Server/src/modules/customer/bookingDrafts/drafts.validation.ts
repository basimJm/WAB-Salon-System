import { z } from 'zod';
import {
  BOOKING_PERSON_NAME_MAX_LENGTH,
  BOOKING_PERSON_NAME_MIN_LENGTH,
} from '../../../constants/bookingDrafts';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { PAYMENT_OPTIONS } from '../../../constants/salon';
import { AVAILABILITY_MAX_SERVICES } from '../../../constants/availability';
import { instantInput } from '../../../utils/time/instantInput';
import { otpTokenSchema } from '../../shared/auth/auth.schemas';
import { GENDERS } from '../../../constants/enums';
import { OBJECT_KEY_PATTERN } from '../../../constants/providers';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
/** Main person + `booking.maxCompanions` is enforced by the service from settings; this is a sanity cap. */
const MAX_PERSONS_SANITY = 20;

/** The persons of a booking: the first is the main one, the rest companions (shared with §5.20). */
export const bookingPersonsSchema = z
  .array(
    z.object({
      name: z
        .string()
        .trim()
        .min(BOOKING_PERSON_NAME_MIN_LENGTH)
        .max(BOOKING_PERSON_NAME_MAX_LENGTH),
      isBride: z.boolean().default(false),
      /**
       * The person's gender (§5.19): a BOTH salon or a clinic takes any gender in one booking; a
       * men's/women's salon only its own (GENDER_MISMATCH). Omitted = the salon's audience.
       */
      gender: z.enum(GENDERS).optional(),
      /** Salon service ids. */
      serviceIds: z.array(objectId).min(1).max(AVAILABILITY_MAX_SERVICES),
      /** Omit for "any available staff". */
      staffId: objectId.optional(),
      /** Slot start (ISO instant); must be a slot returned by the availability endpoint. */
      start: instantInput,
      /** Tattoo studios only (§5.23): a confirmed `BOOKING_REFERENCE` upload key, optional. */
      referenceImageKey: z.string().regex(OBJECT_KEY_PATTERN).optional(),
    }),
  )
  .min(1)
  .max(MAX_PERSONS_SANITY);

export const draftParams = z.object({ id: objectId });
export const createDraftBody = z.object({
  salonId: objectId,
  /** The branch picked at step 1 (§5.18); omit only when the salon has one bookable branch. */
  branchId: objectId.optional(),
  paymentMethod: z.enum(PAYMENT_OPTIONS),
  /** The first person is the account holder (or the bride they book for); the rest are companions. */
  persons: bookingPersonsSchema,
});

/** `otpToken` proving the customer controls their phone (purpose BOOKING_CONFIRMATION). */
export const verifyOtpBody = z.object({ otpToken: otpTokenSchema });
