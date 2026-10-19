export const SDK_NAME = 'wab-storage';

/** Object keys are server-generated paths: `a/b/file.ext`, no empty, `.` or `..` segments. */
export const OBJECT_KEY_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;
export const OBJECT_KEY_MAX_LENGTH = 1_024;
export const CONTENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;
/** Longest validity of a presigned URL (S3 SigV4 limit: 7 days). */
export const MAX_PRESIGN_TTL_SEC = 604_800;
export const DEFAULT_UPLOAD_MAX_TTL_SEC = 300;
export const DEFAULT_SIGNED_URL_MAX_TTL_SEC = 600;
/** S3 DeleteObjects accepts at most 1 000 keys per call. */
export const DELETE_BATCH_SIZE = 1_000;
/** Largest object `read` returns; bigger objects are refused instead of exhausting memory. */
export const DEFAULT_READ_MAX_BYTES = 50 * 1024 * 1024;
export const DEFAULT_PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';
/** Bytes inspected to detect the real file type. */
export const MAGIC_BYTES_LENGTH = 32;

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
  jitterRatio: 0.2,
} as const;

/** Between the original name and the variant name: `x_thumb.webp`. */
export const VARIANT_SEPARATOR = '_';
export const DEFAULT_VARIANTS = {
  thumbWidth: 320,
  mediumWidth: 960,
  quality: 80,
  thumbSuffix: 'thumb',
  mediumSuffix: 'medium',
  extension: 'webp',
  contentType: 'image/webp',
} as const;

export const REDACTED = '[redacted]';
export const SECRET_KEY_PATTERN =
  /secret|password|token|credential|authorization|signature|private.?key/i;
