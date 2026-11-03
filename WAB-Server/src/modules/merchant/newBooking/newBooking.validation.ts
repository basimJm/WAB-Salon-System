import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import {
  BOOKING_PERSON_NAME_MAX_LENGTH,
  BOOKING_PERSON_NAME_MIN_LENGTH,
} from '../../../constants/bookingDrafts';
import { GENDERS } from '../../../constants/enums';
import { phoneSchema } from '../../shared/auth/auth.schemas';
import { bookingPersonsSchema } from '../../customer/bookingDrafts/drafts.validation';

/** `?countryCode=JO&number=791234567` (§5.20). */
export const customerLookupQuery = phoneSchema;

/** A booking the business makes for a customer with or without the app (§5.20). */
export const merchantBookingBody = z.object({
  /** The branch (§5.18): a branch member always books their own; the owner picks one. */
  branchId: z.string().regex(OBJECT_ID_PATTERN).optional(),
  customer: z.object({
    phone: phoneSchema,
    /** Needed when the number has no WAB account (ignored otherwise). */
    name: z
      .string()
      .trim()
      .min(BOOKING_PERSON_NAME_MIN_LENGTH)
      .max(BOOKING_PERSON_NAME_MAX_LENGTH)
      .optional(),
    gender: z.enum(GENDERS).optional(),
  }),
  persons: bookingPersonsSchema,
});
