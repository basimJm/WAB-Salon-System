import { z } from 'zod';
import { CUSTOMER_OTP_PURPOSES, MERCHANT_OTP_PURPOSES } from '../../../constants/otp';
import { E164_PATTERN } from '../../../constants/providers';

const phone = z.string().regex(E164_PATTERN);

export const customerOtpRequestSchema = z.object({
  phone,
  purpose: z.enum(CUSTOMER_OTP_PURPOSES),
});
export const merchantOtpRequestSchema = z.object({
  phone,
  purpose: z.enum(MERCHANT_OTP_PURPOSES),
});
export const wrongAttemptSchema = z.object({ phone });
