import { z } from 'zod';
import { ERROR_CODES } from './constants/codes';
import {
  IDEMPOTENCY_KEY_PATTERN,
  REFERENCE_PATTERN,
  SESSION_ID_PATTERN,
} from './constants/defaults';
import { PaymentSdkError, validationError } from './errors';
import { assertAmountFils } from './money';
import type { CreateSessionRequest, RefundRequest } from './types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
const NAME_MAX = 64;
const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

const customerSchema = z.strictObject({
  email: z.string().regex(EMAIL_PATTERN).max(128).optional(),
  givenName: z.string().min(1).max(NAME_MAX).optional(),
  surname: z.string().min(1).max(NAME_MAX).optional(),
  phone: z.string().regex(E164_PATTERN).optional(),
  ip: z.string().regex(IP_PATTERN).optional(),
});

export const assertKey = (key: unknown): string => {
  if (typeof key !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw validationError('idempotencyKey must be 8-128 characters of A-Z a-z 0-9 : _ . -');
  }
  return key;
};

export const assertReference = (reference: unknown): string => {
  if (typeof reference !== 'string' || !REFERENCE_PATTERN.test(reference)) {
    throw validationError('reference must be 1-64 characters of A-Z a-z 0-9 _ . : -');
  }
  return reference;
};

export const assertSessionId = (id: unknown, label = 'sessionId'): string => {
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) {
    throw validationError(`${label} is not a valid identifier`);
  }
  return id;
};

/** Picks the requested method or the first enabled one; refuses methods that are not enabled. */
export const resolveMethod = (
  requested: string | undefined,
  enabled: readonly string[],
): string => {
  const method = requested ?? enabled[0];
  if (method === undefined || !enabled.includes(method)) {
    throw new PaymentSdkError(ERROR_CODES.METHOD_UNSUPPORTED, 'payment method is not enabled', {
      details: { enabled },
    });
  }
  return method;
};

export const assertCurrency = (requested: string | undefined, configured: string): void => {
  if (requested !== undefined && requested !== configured) {
    throw validationError(`currency must be ${configured}`);
  }
};

export const assertCustomer = (customer: CreateSessionRequest['customer']): void => {
  if (customer === undefined) return;
  if (!customerSchema.safeParse(customer).success) throw validationError('customer is invalid');
};

export const assertSessionRequest = (request: CreateSessionRequest): void => {
  assertKey(request.idempotencyKey);
  assertAmountFils(request.amountFils);
  assertReference(request.reference);
  assertCustomer(request.customer);
};

export const assertRefundRequest = (request: RefundRequest): void => {
  assertKey(request.idempotencyKey);
  assertSessionId(request.sessionId);
  assertAmountFils(request.amountFils);
};
