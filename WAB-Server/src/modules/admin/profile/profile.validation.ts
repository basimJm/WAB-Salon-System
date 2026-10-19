import { z } from 'zod';
import {
  ADMIN_OTP_CODE_PATTERN,
  ADMIN_PASSWORD_INPUT_MAX_LENGTH,
} from '../../../constants/adminAuth';
import { ADMIN_ALERT_EMAILS_MAX, ADMIN_PASSWORD_MIN_LENGTH } from '../../../constants/adminProfile';
import { EMAIL_MAX_LENGTH } from '../../../constants/identity';
import { EMAIL_PATTERN } from '../../../constants/providers';

const email = z.string().trim().max(EMAIL_MAX_LENGTH).regex(EMAIL_PATTERN);
const currentPassword = z.string().min(1).max(ADMIN_PASSWORD_INPUT_MAX_LENGTH);

/** The whole list is replaced; an empty list means the alerts go to the sign-in address. */
export const updateProfileBody = z.object({
  alertEmails: z.array(email).max(ADMIN_ALERT_EMAILS_MAX),
});
export const changePasswordBody = z.object({
  currentPassword,
  newPassword: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_INPUT_MAX_LENGTH),
});
export const requestEmailChangeBody = z.object({ newEmail: email, password: currentPassword });
export const confirmEmailChangeBody = z.object({ code: z.string().regex(ADMIN_OTP_CODE_PATTERN) });
