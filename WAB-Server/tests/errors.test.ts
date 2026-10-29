import { ERROR_CODES, errorMessageKey } from '../src/constants/errorCodes';
import { HTTP_STATUS } from '../src/constants/http';
import {
  BaseError,
  BusinessRuleError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  PaymentError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '../src/utils/errors';

describe('typed errors', () => {
  it.each([
    [
      'ValidationError',
      new ValidationError(),
      HTTP_STATUS.badRequest,
      ERROR_CODES.VALIDATION_ERROR,
      true,
    ],
    [
      'UnauthorizedError',
      new UnauthorizedError(),
      HTTP_STATUS.unauthorized,
      ERROR_CODES.UNAUTHORIZED,
      true,
    ],
    ['ForbiddenError', new ForbiddenError(), HTTP_STATUS.forbidden, ERROR_CODES.FORBIDDEN, true],
    ['NotFoundError', new NotFoundError(), HTTP_STATUS.notFound, ERROR_CODES.NOT_FOUND, true],
    ['ConflictError', new ConflictError(), HTTP_STATUS.conflict, ERROR_CODES.CONFLICT, true],
    [
      'RateLimitError',
      new RateLimitError(),
      HTTP_STATUS.tooManyRequests,
      ERROR_CODES.RATE_LIMITED,
      true,
    ],
    [
      'PaymentError',
      new PaymentError(),
      HTTP_STATUS.paymentRequired,
      ERROR_CODES.PAYMENT_FAILED,
      true,
    ],
    [
      'ExternalServiceError',
      new ExternalServiceError(),
      HTTP_STATUS.badGateway,
      ERROR_CODES.INTERNAL,
      true,
    ],
    [
      'InternalError',
      new InternalError(),
      HTTP_STATUS.internalServerError,
      ERROR_CODES.INTERNAL,
      false,
    ],
  ])('%s has the right defaults', (name, error, status, code, operational) => {
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.httpStatus).toBe(status);
    expect(error.code).toBe(code);
    expect(error.isOperational).toBe(operational);
    expect(error.messageKey).toBe(errorMessageKey(code));
    expect(error.details).toEqual([]);
  });

  it('lets a domain code override the default code but keeps the class status', () => {
    const error = new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });
    expect(error.code).toBe('SLOT_TAKEN');
    expect(error.httpStatus).toBe(HTTP_STATUS.conflict);
    expect(error.messageKey).toBe('errors.SLOT_TAKEN');
  });

  it('BusinessRuleError requires an explicit domain code and uses 422', () => {
    const error = new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
    expect(error.httpStatus).toBe(HTTP_STATUS.unprocessableEntity);
    expect(error.code).toBe('INVALID_TRANSITION');
  });

  it('ExternalServiceError can report 503 for unavailable providers', () => {
    expect(new ExternalServiceError({ unavailable: true }).httpStatus).toBe(
      HTTP_STATUS.serviceUnavailable,
    );
  });

  it('carries details, params, custom message key and cause', () => {
    const cause = new Error('driver failed');
    const error = new ValidationError({
      messageKey: 'errors.custom',
      messageParams: { max: 5 },
      details: [{ field: 'phone', code: 'INVALID', messageKey: 'errors.VALIDATION_ERROR' }],
      cause,
    });
    expect(error.messageKey).toBe('errors.custom');
    expect(error.messageParams).toEqual({ max: 5 });
    expect(error.details).toHaveLength(1);
    expect(error.cause).toBe(cause);
  });

  it('InternalError is never operational even when given a cause', () => {
    expect(new InternalError({ cause: new Error('x') }).isOperational).toBe(false);
  });
});

describe('error codes', () => {
  it('matches the BUSINESS_DOMAIN.md §11 list exactly', () => {
    expect(Object.keys(ERROR_CODES).sort()).toEqual(
      [
        'VALIDATION_ERROR',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'PERMISSION_DENIED',
        'NOT_FOUND',
        'CONFLICT',
        'RATE_LIMITED',
        'INTERNAL',
        'OTP_BLOCKED',
        'OTP_INVALID',
        'OTP_EXPIRED',
        'OTP_DELIVERY_FAILED',
        'PHONE_NOT_REGISTERED',
        'PHONE_ALREADY_REGISTERED',
        'ACCOUNT_BLOCKED',
        'MEMBER_INACTIVE',
        'CURRENT_PASSWORD_INVALID',
        'EMAIL_ALREADY_USED',
        'SALON_NOT_FOUND',
        'SALON_NOT_BOOKABLE',
        'BRANCH_NOT_FOUND',
        'BRANCH_NOT_BOOKABLE',
        'BRANCH_REQUIRED',
        'BRANCH_LIMIT_REACHED',
        'BRANCH_HAS_UPCOMING_BOOKINGS',
        'LAST_BRANCH',
        'BRANCH_SCOPE_DENIED',
        'SALON_CLOSED',
        'GENDER_MISMATCH',
        'BUSINESS_TYPE_MISMATCH',
        'AUDIENCE_CHANGE_NOT_ALLOWED',
        'BRIDE_NOT_ALLOWED',
        'TOO_MANY_COMPANIONS',
        'SERVICE_UNAVAILABLE',
        'BRIDE_ONLY_SERVICE',
        'STAFF_NOT_ELIGIBLE',
        'SLOT_UNAVAILABLE',
        'SLOT_TAKEN',
        'DATE_OUT_OF_RANGE',
        'PAYMENT_FAILED',
        'PAYMENT_NOT_VERIFIED',
        'PAYMENT_OPTION_NOT_ALLOWED',
        'DRAFT_EXPIRED',
        'INVALID_TRANSITION',
        'CANCELLATION_WINDOW_PASSED',
        'TOO_EARLY_TO_COMPLETE',
        'ALREADY_HANDLED',
        'SCHEDULE_CONFLICT',
        'OWNER_REQUIRED',
        'LAST_OWNER',
        'UPLOAD_INVALID',
        'UPLOAD_TOO_LARGE',
        'MAINTENANCE',
        'UPDATE_REQUIRED',
      ].sort(),
    );
  });

  it('uses each code as its own value', () => {
    for (const [key, value] of Object.entries(ERROR_CODES)) expect(value).toBe(key);
  });
});
