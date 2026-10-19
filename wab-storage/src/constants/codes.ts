export const ERROR_CODES = {
  CONFIG_INVALID: 'STORAGE_CONFIG_INVALID',
  VALIDATION_FAILED: 'STORAGE_VALIDATION_FAILED',
  KEY_INVALID: 'STORAGE_KEY_INVALID',
  TYPE_NOT_ALLOWED: 'STORAGE_TYPE_NOT_ALLOWED',
  ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
  AUTH_FAILED: 'STORAGE_AUTH_FAILED',
  NETWORK_ERROR: 'STORAGE_NETWORK_ERROR',
  TIMEOUT: 'STORAGE_TIMEOUT',
  RATE_LIMITED: 'STORAGE_RATE_LIMITED',
  UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  VENDOR_ERROR: 'STORAGE_VENDOR_ERROR',
  MALFORMED_RESPONSE: 'STORAGE_MALFORMED_RESPONSE',
  VARIANT_FAILED: 'STORAGE_VARIANT_FAILED',
  UNKNOWN: 'STORAGE_UNKNOWN',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ENVIRONMENTS = ['dev', 'prod'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const PROVIDERS = ['memory', 'local-fs', 's3'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

/** Why an uploaded object was refused (and deleted) by `confirmUpload`. */
export const REJECTION_REASONS = ['NOT_FOUND', 'EMPTY', 'TYPE_MISMATCH', 'TOO_LARGE'] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const UPLOAD_METHOD = 'PUT';
export const CONTENT_TYPE_HEADER = 'Content-Type';

export const SIGNED_URL_MODES = ['s3', 'cloudfront'] as const;
export type SignedUrlMode = (typeof SIGNED_URL_MODES)[number];
