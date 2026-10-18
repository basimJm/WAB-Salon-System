import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ERROR_CODES } from '../constants/codes';
import { HYPERPAY_PAYMENT_TYPES, HYPERPAY_WEBHOOK } from '../constants/hyperpay';
import { PaymentSdkError } from '../errors';
import { decimalToFils } from '../money';
import type { GatewayWebhookEvent, WebhookInput } from '../types';
import { classifyResult, paymentStatusOf, refundStatusOf } from './codes';
import { decryptNotification } from './crypto';
import { paymentSchema, type HyperPayContext } from './session';

const envelopeSchema = z.looseObject({ type: z.string(), payload: z.unknown().optional() });
const jsonBodySchema = z.looseObject({ encryptedBody: z.string() });

const invalid = (reason: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.WEBHOOK_INVALID, reason);

const header = (headers: WebhookInput['headers'], name: string): string | undefined => {
  if (headers === undefined) return undefined;
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  return key === undefined ? undefined : headers[key];
};

/** The hex ciphertext: the raw body itself, or `{ "encryptedBody": "<hex>" }` when sent as JSON. */
const cipherTextOf = (rawBody: string): string => {
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = jsonBodySchema.safeParse(JSON.parse(trimmed));
    if (parsed.success) return parsed.data.encryptedBody;
  } catch {
    // fall through: not JSON
  }
  throw invalid('notification body is not encrypted');
};

const amountOf = (text: string | undefined, ctx: HyperPayContext): number | undefined => {
  if (text === undefined) return undefined;
  try {
    return decimalToFils(text, ctx.currency);
  } catch {
    return undefined;
  }
};

const ignored = (type: string, eventId: string): GatewayWebhookEvent => ({
  kind: 'IGNORED',
  sessionId: '',
  status: 'UNKNOWN',
  gatewayCode: '',
  gatewayMessage: `notification type ${type} is not handled`,
  eventId,
});

/**
 * Authenticates (AES-256-GCM tag check with the portal key) and decrypts a HyperPay notification,
 * then maps it to the normalized event. Anything that does not authenticate throws
 * `PAYMENT_WEBHOOK_INVALID`; authentic notifications of other types are `IGNORED`.
 */
export const parseWebhook = async (
  ctx: HyperPayContext,
  input: WebhookInput,
): Promise<GatewayWebhookEvent> => {
  const key = ctx.settings.webhookDecryptionKey;
  if (key === undefined) throw invalid('webhook decryption is not configured');
  const iv = header(input.headers, HYPERPAY_WEBHOOK.ivHeader);
  const tag = header(input.headers, HYPERPAY_WEBHOOK.tagHeader) ?? input.signature;
  if (iv === undefined || tag === '') throw invalid('missing initialization vector or tag');

  const plain = decryptNotification({ body: cipherTextOf(input.rawBody), iv, tag }, key);
  const digest = (value: unknown): string =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const eventId = digest(plain);
  let json: unknown;
  try {
    json = JSON.parse(plain);
  } catch {
    throw invalid('notification is not JSON');
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) throw invalid('notification has no type');
  const type = envelope.data.type.toUpperCase();
  if (type !== 'PAYMENT') return ignored(envelope.data.type, eventId);
  const payload = paymentSchema.safeParse(envelope.data.payload);
  if (!payload.success) throw invalid('notification payload is not a payment');
  const body = payload.data;
  const { code, description } = body.result;
  const category = classifyResult(code);
  const amountFils = amountOf(body.amount, ctx);
  // Only the stable facts identify a notification: timestamps and build numbers differ on a resend.
  const stableId = digest([
    type,
    body.id,
    body.paymentType,
    code,
    body.amount,
    body.currency,
    body.referencedId,
  ]);
  const common = {
    gatewayCode: code,
    gatewayMessage: description,
    eventId: stableId,
    ...(body.merchantTransactionId === undefined ? {} : { reference: body.merchantTransactionId }),
    ...(amountFils === undefined ? {} : { amountFils }),
  };

  if (body.paymentType === HYPERPAY_PAYMENT_TYPES.refund) {
    const sessionId =
      (body.referencedId === undefined
        ? undefined
        : await ctx.directory.sessionOf(body.referencedId)) ?? body.referencedId;
    if (sessionId === undefined)
      throw new PaymentSdkError(
        ERROR_CODES.MALFORMED_RESPONSE,
        'refund notification has no payment',
      );
    return {
      kind: 'REFUND',
      sessionId,
      // Meaningless for refunds: consumers read `refundStatus`.
      status: 'UNKNOWN',
      refundStatus: refundStatusOf(category),
      ...(body.id === undefined ? {} : { paymentId: body.id }),
      ...common,
    };
  }
  const sessionId =
    body.ndc ?? (body.id === undefined ? undefined : await ctx.directory.sessionOf(body.id));
  if (sessionId === undefined) {
    throw new PaymentSdkError(
      ERROR_CODES.MALFORMED_RESPONSE,
      'payment notification has no checkout id',
    );
  }
  const status = paymentStatusOf(category);
  if (status === 'SUCCEEDED' && body.id !== undefined) {
    await ctx.directory.put(sessionId, { paymentId: body.id });
  }
  return {
    kind: 'PAYMENT',
    sessionId,
    status,
    ...(body.id === undefined ? {} : { paymentId: body.id }),
    ...common,
  };
};
