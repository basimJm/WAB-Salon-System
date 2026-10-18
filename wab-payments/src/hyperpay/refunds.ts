import { ERROR_CODES } from '../constants/codes';
import { REFUND_REFERENCE_PREFIX } from '../constants/defaults';
import { HYPERPAY_PARAMS, HYPERPAY_PATHS, HYPERPAY_PAYMENT_TYPES } from '../constants/hyperpay';
import { HTTP_STATUS } from '../constants/http';
import { REFUND_EXCEEDS_PATTERN, REFUND_NOT_CAPTURED_PATTERN } from '../constants/resultCodes';
import { PaymentSdkError, validationError } from '../errors';
import { redact } from '../logger';
import { decimalToFils, filsToDecimal } from '../money';
import type { GatewayRefundRequest, RefundResult } from '../types';
import { classifyResult, refundStatusOf } from './codes';
import type { HyperPayResponse } from './client';
import {
  assertNotRequestError,
  fetchPayment,
  paymentSchema,
  parseWith,
  type HyperPayContext,
  type OppPayment,
} from './session';

/** The merchant transaction id of a refund: derived from the idempotency key, so it is findable. */
export const refundReference = (idempotencyKey: string): string =>
  `${REFUND_REFERENCE_PREFIX}${idempotencyKey}`;

/** OPP answers an over-refund / uncapturable payment with 700.400.x result codes. */
const assertRefundAllowed = (code: string, description: string): void => {
  if (REFUND_EXCEEDS_PATTERN.test(code)) {
    throw new PaymentSdkError(ERROR_CODES.REFUND_EXCEEDS, 'refund exceeds the captured amount', {
      details: { resultCode: code, resultDescription: description },
    });
  }
  if (REFUND_NOT_CAPTURED_PATTERN.test(code)) {
    throw validationError('only a captured payment can be refunded');
  }
};

const toRefund = async (
  ctx: HyperPayContext,
  body: OppPayment,
  response: HyperPayResponse,
  fallback: { sessionId?: string; reference?: string },
): Promise<RefundResult> => {
  const { code, description } = body.result;
  assertRefundAllowed(code, description);
  assertNotRequestError(code, description);
  const sessionId =
    fallback.sessionId ??
    (body.referencedId === undefined
      ? undefined
      : await ctx.directory.sessionOf(body.referencedId)) ??
    body.referencedId ??
    'unknown';
  return {
    refundId: body.id ?? fallback.reference ?? 'unknown',
    sessionId,
    status: refundStatusOf(classifyResult(code)),
    amountFils: body.amount === undefined ? 0 : decimalToFils(body.amount, ctx.currency),
    gatewayCode: code,
    gatewayMessage: description,
    raw: redact(response.json),
  };
};

/** An earlier refund made with the same idempotency key (a lost answer must never refund twice). */
const findExisting = async (
  ctx: HyperPayContext,
  reference: string,
  sessionId: string,
): Promise<RefundResult | undefined> => {
  const response = await ctx.client.get(HYPERPAY_PATHS.query, {
    [HYPERPAY_PARAMS.merchantTransactionId]: reference,
  });
  if (response.status === HTTP_STATUS.notFound) return undefined;
  const records = response.json.records;
  if (!Array.isArray(records)) return undefined;
  for (const record of records as unknown[]) {
    const parsed = paymentSchema.safeParse(record);
    if (parsed.success && parsed.data.paymentType === HYPERPAY_PAYMENT_TYPES.refund) {
      return toRefund(ctx, parsed.data, response, { sessionId, reference });
    }
  }
  return undefined;
};

/** Finds the gateway payment of a checkout: directory first, then the checkout itself. */
const paymentIdOf = async (ctx: HyperPayContext, sessionId: string): Promise<string> => {
  const known = await ctx.directory.get(sessionId);
  if (known !== undefined) return known.paymentId;
  const verification = await fetchPayment(ctx, sessionId);
  if (verification.status !== 'SUCCEEDED' || verification.paymentId === undefined) {
    throw validationError('only a succeeded payment can be refunded');
  }
  return verification.paymentId;
};

/** Full or partial refund against the captured payment (`paymentType=RF`). */
export const refund = async (
  ctx: HyperPayContext,
  request: GatewayRefundRequest,
): Promise<RefundResult> => {
  const reference = refundReference(request.idempotencyKey);
  const existing = await findExisting(ctx, reference, request.sessionId);
  if (existing !== undefined) return existing;
  const paymentId = await paymentIdOf(ctx, request.sessionId);
  const response = await ctx.client.post(HYPERPAY_PATHS.payment(paymentId), {
    [HYPERPAY_PARAMS.amount]: filsToDecimal(
      request.amountFils,
      request.currency,
      ctx.settings.amountDecimals,
    ),
    [HYPERPAY_PARAMS.currency]: request.currency,
    [HYPERPAY_PARAMS.paymentType]: HYPERPAY_PAYMENT_TYPES.refund,
    [HYPERPAY_PARAMS.merchantTransactionId]: reference,
  });
  const body = parseWith(paymentSchema, response, 'refund');
  return toRefund(ctx, body, response, { sessionId: request.sessionId, reference });
};

/** Current state of a refund (they can stay pending for days). */
export const fetchRefund = async (
  ctx: HyperPayContext,
  refundId: string,
): Promise<RefundResult> => {
  const response = await ctx.client.get(HYPERPAY_PATHS.payment(refundId));
  if (response.status === HTTP_STATUS.notFound) {
    throw new PaymentSdkError(ERROR_CODES.REFUND_NOT_FOUND, 'unknown refund');
  }
  const body = parseWith(paymentSchema, response, 'refund');
  if (body.paymentType !== HYPERPAY_PAYMENT_TYPES.refund) {
    throw new PaymentSdkError(ERROR_CODES.REFUND_NOT_FOUND, 'the identifier is not a refund');
  }
  return toRefund(ctx, body, response, {});
};
