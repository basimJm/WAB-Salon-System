import { z } from 'zod';
import { PERSON_NAME_MAX_LENGTH, PERSON_NAME_MIN_LENGTH } from '../../../constants/identity';
import { STORAGE_KEY_MAX_LENGTH, STORAGE_KEY_PATTERN } from '../../../constants/salon';
import { otpTokenSchema, phoneSchema } from '../../shared/auth/auth.schemas';

const name = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);

/** Send only what changed; `photoKey: null` removes the photo. */
export const updateMeSchema = z
  .object({
    firstName: name,
    lastName: name,
    photoKey: z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN).nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'at least one field to change',
  });

/** The new number and the Firebase ID token proving it (OTP sent to the new number). */
export const changePhoneSchema = z.object({
  phone: phoneSchema,
  otpToken: otpTokenSchema,
});
