import { ERROR_CODES, type ErrorCode } from '../constants/codes';
import type { PaymentStatus, RefundStatus } from '../constants/defaults';
import { RESULT_RULES, type ResultCategory } from '../constants/resultCodes';

export const classifyResult = (code: string): ResultCategory =>
  RESULT_RULES.find((rule) => rule.pattern.test(code))?.category ?? 'UNKNOWN';

const PAYMENT_STATUS_OF: Partial<Record<ResultCategory, PaymentStatus>> = {
  SUCCESS: 'SUCCEEDED',
  REVIEW: 'PENDING',
  PENDING: 'PENDING',
  NO_PAYMENT: 'PENDING',
  CANCELLED: 'CANCELLED',
  UNCERTAIN: 'UNKNOWN',
  REJECTED: 'FAILED',
  COMMUNICATION: 'FAILED',
  SYSTEM: 'FAILED',
  UNKNOWN: 'UNKNOWN',
};

const REFUND_STATUS_OF: Partial<Record<ResultCategory, RefundStatus>> = {
  SUCCESS: 'REFUNDED',
  REVIEW: 'REFUND_PENDING',
  PENDING: 'REFUND_PENDING',
  NO_PAYMENT: 'REFUND_PENDING',
  CANCELLED: 'REFUND_FAILED',
  UNCERTAIN: 'UNKNOWN',
  REJECTED: 'REFUND_FAILED',
  COMMUNICATION: 'REFUND_FAILED',
  SYSTEM: 'REFUND_FAILED',
  UNKNOWN: 'UNKNOWN',
};

/** Categories that describe a broken request or credentials, not a payment outcome. */
const REQUEST_ERROR_OF: Partial<Record<ResultCategory, { code: ErrorCode; retryable: boolean }>> = {
  AUTH: { code: ERROR_CODES.AUTH_FAILED, retryable: false },
  THROTTLED: { code: ERROR_CODES.RATE_LIMITED, retryable: true },
  NOT_FOUND: { code: ERROR_CODES.SESSION_NOT_FOUND, retryable: false },
  INVALID_REQUEST: { code: ERROR_CODES.VENDOR_ERROR, retryable: false },
};

/** `undefined` for categories that are payment outcomes (see `paymentStatusOf`). */
export const requestErrorOf = (
  category: ResultCategory,
): { code: ErrorCode; retryable: boolean } | undefined => REQUEST_ERROR_OF[category];

export const paymentStatusOf = (category: ResultCategory): PaymentStatus =>
  PAYMENT_STATUS_OF[category] ?? 'UNKNOWN';

export const refundStatusOf = (category: ResultCategory): RefundStatus =>
  REFUND_STATUS_OF[category] ?? 'UNKNOWN';
