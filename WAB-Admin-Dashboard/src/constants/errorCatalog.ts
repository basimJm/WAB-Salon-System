import type { ErrorKind } from './errors';

/**
 * Every server error code (BUSINESS_DOMAIN.md §11) and how the panel treats it.
 * `tests/errorCatalog.test.ts` keeps this list equal to that document and to the OpenAPI enum,
 * and requires a message for each code in both locales (`errors.codes.<CODE>`).
 */
export const ERROR_CODE_KIND = {
  VALIDATION_ERROR: 'validation',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  PERMISSION_DENIED: 'forbidden',
  NOT_FOUND: 'notFound',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rateLimited',
  INTERNAL: 'server',
  OTP_BLOCKED: 'rateLimited',
  OTP_INVALID: 'validation',
  OTP_EXPIRED: 'validation',
  PHONE_NOT_REGISTERED: 'notFound',
  PHONE_ALREADY_REGISTERED: 'conflict',
  ACCOUNT_BLOCKED: 'forbidden',
  MEMBER_INACTIVE: 'forbidden',
  SALON_NOT_FOUND: 'notFound',
  SALON_NOT_BOOKABLE: 'conflict',
  SALON_CLOSED: 'conflict',
  GENDER_MISMATCH: 'conflict',
  TOO_MANY_COMPANIONS: 'validation',
  SERVICE_UNAVAILABLE: 'conflict',
  BRIDE_ONLY_SERVICE: 'conflict',
  STAFF_NOT_ELIGIBLE: 'conflict',
  SLOT_UNAVAILABLE: 'conflict',
  SLOT_TAKEN: 'conflict',
  DATE_OUT_OF_RANGE: 'validation',
  PAYMENT_FAILED: 'conflict',
  PAYMENT_NOT_VERIFIED: 'conflict',
  PAYMENT_OPTION_NOT_ALLOWED: 'validation',
  DRAFT_EXPIRED: 'conflict',
  INVALID_TRANSITION: 'conflict',
  CANCELLATION_WINDOW_PASSED: 'conflict',
  TOO_EARLY_TO_COMPLETE: 'conflict',
  ALREADY_HANDLED: 'conflict',
  SCHEDULE_CONFLICT: 'conflict',
  OWNER_REQUIRED: 'conflict',
  LAST_OWNER: 'conflict',
  CURRENT_PASSWORD_INVALID: 'validation',
  EMAIL_ALREADY_USED: 'conflict',
  UPLOAD_INVALID: 'validation',
  UPLOAD_TOO_LARGE: 'validation',
  MAINTENANCE: 'server',
  UPDATE_REQUIRED: 'conflict',
  BRANCH_NOT_FOUND: 'notFound',
  BRANCH_NOT_BOOKABLE: 'conflict',
  BRANCH_REQUIRED: 'validation',
  BRANCH_LIMIT_REACHED: 'conflict',
  BRANCH_HAS_UPCOMING_BOOKINGS: 'conflict',
  LAST_BRANCH: 'conflict',
  BRANCH_SCOPE_DENIED: 'forbidden',
} as const satisfies Record<string, ErrorKind>;

export type ErrorCode = keyof typeof ERROR_CODE_KIND;
export const ERROR_CODES = Object.keys(ERROR_CODE_KIND) as ErrorCode[];
export const ERROR_CODE_MESSAGE_PREFIX = 'errors.codes.';

export const isErrorCode = (code: unknown): code is ErrorCode =>
  typeof code === 'string' && Object.hasOwn(ERROR_CODE_KIND, code);
