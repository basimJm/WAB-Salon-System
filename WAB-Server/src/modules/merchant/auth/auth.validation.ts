import { z } from 'zod';
import {
  otpTokenSchema as otpToken,
  installationSchema as installation,
  phoneSchema as phone,
  refreshTokenSchema as refreshToken,
} from '../../shared/auth/auth.schemas';

export const checkPhoneSchema = z.object({ phone });
export const loginSchema = z.object({ phone, otpToken, installation });
export const refreshSchema = z.object({ refreshToken });
