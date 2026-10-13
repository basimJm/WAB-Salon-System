import { z } from 'zod';
import {
  ADMIN_OTP_CODE_PATTERN,
  ADMIN_PASSWORD_INPUT_MAX_LENGTH,
} from '../../../constants/adminAuth';
import { EMAIL_MAX_LENGTH } from '../../../constants/identity';
import { EMAIL_PATTERN } from '../../../constants/providers';
import { refreshTokenSchema } from '../../shared/auth/auth.schemas';

const email = z.string().trim().max(EMAIL_MAX_LENGTH).regex(EMAIL_PATTERN);

export const refreshSchema = z.object({ refreshToken: refreshTokenSchema });
export const loginSchema = z.object({
  email,
  // Only bounded here: the length rules of a password are not checked at sign-in.
  password: z.string().min(1).max(ADMIN_PASSWORD_INPUT_MAX_LENGTH),
});
export const verifyOtpSchema = z.object({ email, code: z.string().regex(ADMIN_OTP_CODE_PATTERN) });
