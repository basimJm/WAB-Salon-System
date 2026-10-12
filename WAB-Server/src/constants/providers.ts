/** External-provider constants (SRV-022): how providers are selected and their static rules. */
export const PROVIDER_MODES = ['fake', 'real'] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];
/** Used when the variable is absent outside production; production must say `real` explicitly. */
export const DEFAULT_PROVIDER_MODE: ProviderMode = 'fake';
export const REAL_PROVIDER_MODE: ProviderMode = 'real';

/** Why a purpose is verified (BUSINESS_DOMAIN.md §4.2, wab-otp BRD §4.1). */
export const OTP_PURPOSES = [
  'LOGIN',
  'REGISTER',
  'CHANGE_PHONE',
  'BOOKING_CONFIRMATION',
  'BANK_DETAILS',
  'SALON_REGISTER',
] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/** Phone numbers cross the provider boundary in E.164 (`+9627…`). */
export const E164_PATTERN = /^\+[1-9][0-9]{6,14}$/;

/** Outcomes of checking a provider proof; provider failures are thrown, not returned. */
export const OTP_OUTCOMES = ['VERIFIED', 'INVALID_PROOF', 'PHONE_MISMATCH', 'EXPIRED'] as const;
export type OtpOutcome = (typeof OTP_OUTCOMES)[number];

/** Test proofs of the fake OTP provider: `fake-otp:<kind>:<phone>`. */
export const FAKE_OTP_PROOF_PREFIX = 'fake-otp';
export const FAKE_OTP_PROOF_SEPARATOR = ':';
export const FAKE_OTP_PROOF_KINDS = ['valid', 'expired', 'invalid', 'provider-error'] as const;
export type FakeOtpProofKind = (typeof FAKE_OTP_PROOF_KINDS)[number];

export const STORAGE_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type StorageVisibility = (typeof STORAGE_VISIBILITIES)[number];

/** Object keys are server-generated paths: `a/b/file.ext`, no empty, `.` or `..` segments. */
export const OBJECT_KEY_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;
export const OBJECT_KEY_MAX_LENGTH = 1_024;
export const CONTENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;
/** Longest validity of a presigned URL (S3 SigV4 limit: 7 days). */
export const MAX_PRESIGN_TTL_SEC = 604_800;
export const UPLOAD_METHOD = 'PUT';
export const CONTENT_TYPE_HEADER = 'Content-Type';

export const STORAGE_REJECTION_REASONS = ['NOT_FOUND', 'TYPE_MISMATCH', 'TOO_LARGE'] as const;
export type StorageRejectionReason = (typeof STORAGE_REJECTION_REASONS)[number];

/** `.invalid` is a reserved TLD: fake URLs can never reach a real host. */
export const FAKE_STORAGE_UPLOAD_BASE_URL = 'https://fake-storage.invalid/upload';
export const FAKE_STORAGE_CDN_BASE_URL = 'https://fake-cdn.invalid';
export const FAKE_STORAGE_SIGNED_PATH = 'private';
export const FAKE_STORAGE_SIGNATURE = 'fake-signature';
