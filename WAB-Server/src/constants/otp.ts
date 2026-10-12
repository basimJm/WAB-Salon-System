/** OTP platform limits and routes (SRV-027, BUSINESS_DOMAIN.md §3.1 and §10). */
export const OTP_KEY_PREFIX = {
  requests: 'otp:req',
  wrong: 'otp:wrong',
  /** Shared by requests and wrong codes: either limit blocks both. */
  block: 'otp:block',
  resend: 'otp:resend',
} as const;

/** What a verification is for. The customer app has no bank details; the merchant app no bookings. */
export const CUSTOMER_OTP_PURPOSES = [
  'LOGIN',
  'REGISTER',
  'CHANGE_PHONE',
  'BOOKING_CONFIRMATION',
] as const;
export const MERCHANT_OTP_PURPOSES = ['LOGIN', 'REGISTER', 'CHANGE_PHONE', 'BANK_DETAILS'] as const;
export type OtpPurpose = (typeof CUSTOMER_OTP_PURPOSES | typeof MERCHANT_OTP_PURPOSES)[number];

export const OTP_ROUTES = {
  base: '/auth/otp',
  request: '/request',
  wrongAttempt: '/wrong-attempt',
} as const;

/** Per-IP guard on the OTP endpoints, on top of the per-phone limits and the global limiter. */
export const OTP_ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 20 } as const;
