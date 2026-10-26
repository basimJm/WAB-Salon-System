import type { Language } from './i18n';

/** OTP platform limits and routes (SRV-027, BUSINESS_DOMAIN.md §3.1, §3.1a and §10). */
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
  verify: '/verify',
} as const;

/**
 * Namespace placed in front of the SDK's own keys. Empty: the SDK already writes the domain's
 * `otp:code:{purpose}:{e164}` and `otp:used:{jti}` (BUSINESS_DOMAIN.md §3.1).
 */
export const OTP_CODE_KEY_PREFIX = '';

/** Random bytes of a per-process secret the fake provider makes when OTP_*_SECRET is unset (dev). */
export const OTP_GENERATED_SECRET_BYTES = 32;

/** A typed code: digits only, as long as `otp.length` allows (settings limits 4..10). */
export const OTP_CODE_PATTERN = /^[0-9]{4,10}$/;
/** The wrong-code error detail: points at the typed code and says how many attempts are left. */
export const OTP_WRONG_CODE_DETAIL = {
  field: 'body.code',
  messageKey: 'otp.attemptsRemaining',
} as const;

/** Upper bound on the `otpToken` the apps send back (a signed proof of ~200 characters). */
export const OTP_TOKEN_MAX_LENGTH = 2048;

/** App language → language of the approved WhatsApp authentication template. */
export const WHATSAPP_TEMPLATE_LANGUAGES: Readonly<Record<Language, string>> = {
  ar: 'ar',
  en: 'en_US',
};

/** The one OTP channel (BUSINESS_DOMAIN.md §10 `otp.channel`); there is no SMS fallback. */
export const OTP_CHANNELS = ['WHATSAPP'] as const;
export type OtpChannelName = (typeof OTP_CHANNELS)[number];

/** Per-IP guard on the OTP endpoints, on top of the per-phone limits and the global limiter. */
export const OTP_ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 20 } as const;
