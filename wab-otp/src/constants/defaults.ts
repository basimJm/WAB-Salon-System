export const ENVIRONMENTS = ['dev', 'prod'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const PROVIDERS = ['fake', 'firebase', 'custom'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

/** Extensible by consumers through the `string` brand; these are the platform's own purposes. */
export const OTP_PURPOSES = [
  'LOGIN',
  'REGISTER',
  'CHANGE_PHONE',
  'BOOKING_CONFIRMATION',
  'BANK_DETAILS',
  'SALON_REGISTER',
] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number] | (string & Record<never, never>);
export const PURPOSE_PATTERN = /^[A-Z][A-Z0-9_]{1,40}$/;
export const MAX_PROOF_LENGTH = 8192;

/** What `verify` can answer. Provider outages are errors, never outcomes. */
export const VERIFY_OUTCOMES = [
  'VERIFIED',
  'INVALID_PROOF',
  'PHONE_MISMATCH',
  'EXPIRED',
  'PURPOSE_MISMATCH',
  'BLOCKED',
] as const;
export type VerifyOutcome = (typeof VERIFY_OUTCOMES)[number];

export const FAILURE_REASONS = ['WRONG_CODE', 'EXPIRED', 'PROVIDER_ERROR'] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

/** Defaults only: every value is overridable through the options (platform admin settings). */
export const DEFAULT_LIMITS = {
  requestMax: 5,
  requestWindowSec: 300,
  wrongMax: 5,
  blockSec: 900,
} as const;

export const DEFAULT_OTP = { otpLength: 6, resendAfterSec: 60 } as const;

export const DEFAULT_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  jitterRatio: 0.2,
} as const;

export const DEFAULT_FIREBASE = {
  /** Public keys of Firebase ID tokens, in JWK form (Google's documented endpoint). */
  jwksUrl:
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  issuerPrefix: 'https://securetoken.google.com/',
  signInProviderPhone: 'phone',
  algorithm: 'RS256',
  timeoutMs: 5000,
  clockSkewSec: 30,
  /** Older sign-ins are refused: a proof must belong to the code the user just typed. */
  maxAuthAgeSec: 600,
  /** Used when the key endpoint sends no usable Cache-Control. */
  fallbackKeyTtlSec: 3600,
  minKeyTtlSec: 60,
} as const;

/** Key prefixes of the limiter store (the consumer may add its own namespace in front). */
export const LIMIT_KEY_PREFIX = {
  requests: 'otp:req',
  wrong: 'otp:wrong',
  block: 'otp:block',
  resend: 'otp:resend',
} as const;

export const MS_PER_SECOND = 1000;
export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
export const SDK_NAME = 'wab-otp';
