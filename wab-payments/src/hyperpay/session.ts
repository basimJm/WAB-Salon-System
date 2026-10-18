import { z } from 'zod';
import type { ResolvedHyperPay } from '../config/options';
import { ERROR_CODES } from '../constants/codes';
import type { CurrencyCode, Environment, ProviderName } from '../constants/defaults';
import { HYPERPAY_PARAMS, HYPERPAY_PATHS } from '../constants/hyperpay';
import { CHECKOUT_CREATED_PATTERN } from '../constants/resultCodes';
import { PaymentSdkError } from '../errors';
import { redact } from '../logger';
import { decimalToFils, filsToDecimal } from '../money';
import type { GatewayCheckoutRequest, PaymentSession, PaymentVerification } from '../types';
import { classifyResult, paymentStatusOf, requestErrorOf } from './codes';
import type { HyperPayClient, HyperPayResponse } from './client';

export interface HyperPayContext {
  readonly provider: ProviderName;
  readonly environment: Environment;
  readonly currency: CurrencyCode;
  readonly settings: ResolvedHyperPay;
  readonly client: HyperPayClient;
}

const resultSchema = z.object({ code: z.string().min(1), description: z.string().default('') });
const checkoutSchema = z.looseObject({ id: z.string().min(1), result: resultSchema });
export const paymentSchema = z.looseObject({
  id: z.string().min(1).optional(),
  paymentType: z.string().optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  merchantTransactionId: z.string().optional(),
  referencedId: z.string().optional(),
  ndc: z.string().optional(),
  result: resultSchema,
});
export type OppPayment = z.infer<typeof paymentSchema>;

const malformed = (what: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.MALFORMED_RESPONSE, `gateway ${what} is malformed`);

export const parseWith = <T extends z.ZodType>(
  schema: T,
  response: HyperPayResponse,
  what: string,
): z.infer<T> => {
  const parsed = schema.safeParse(response.json);
  if (!parsed.success) throw malformed(what);
  return parsed.data;
};

/** Throws the typed error for result codes that mean a broken request, bad credentials or a missing object. */
export const assertNotRequestError = (code: string, description: string): void => {
  const mapped = requestErrorOf(classifyResult(code));
  if (mapped !== undefined) {
    throw new PaymentSdkError(mapped.code, 'gateway rejected the request', {
      retryable: mapped.retryable,
      details: { resultCode: code, resultDescription: description },
    });
  }
};

const checkoutForm = (
  ctx: HyperPayContext,
  request: GatewayCheckoutRequest,
): Record<string, string> => {
  const { settings } = ctx;
  const { customer } = request;
  const form: Record<string, string> = {
    [HYPERPAY_PARAMS.amount]: filsToDecimal(
      request.amountFils,
      request.currency,
      settings.amountDecimals,
    ),
    [HYPERPAY_PARAMS.currency]: request.currency,
    [HYPERPAY_PARAMS.paymentType]: settings.paymentType,
    [HYPERPAY_PARAMS.merchantTransactionId]: request.reference,
    [HYPERPAY_PARAMS.shopperResultUrl]: settings.shopperResultUrl,
    [`${HYPERPAY_PARAMS.customParametersPrefix}[idempotencyKey]`]: request.idempotencyKey,
  };
  if (settings.integrity) form[HYPERPAY_PARAMS.integrity] = 'true';
  if (settings.testMode !== undefined) form[HYPERPAY_PARAMS.testMode] = settings.testMode;
  if (customer?.email !== undefined) form[HYPERPAY_PARAMS.customerEmail] = customer.email;
  if (customer?.givenName !== undefined)
    form[HYPERPAY_PARAMS.customerGivenName] = customer.givenName;
  if (customer?.surname !== undefined) form[HYPERPAY_PARAMS.customerSurname] = customer.surname;
  if (customer?.phone !== undefined) form[HYPERPAY_PARAMS.customerPhone] = customer.phone;
  if (customer?.ip !== undefined) form[HYPERPAY_PARAMS.customerIp] = customer.ip;
  return form;
};

const brandsFor = (settings: ResolvedHyperPay, method: string): readonly string[] => {
  const configured = settings.brands[method];
  if (configured === undefined) {
    throw new PaymentSdkError(ERROR_CODES.METHOD_UNSUPPORTED, 'no payment brands for the method');
  }
  return configured.split(/\s+/).filter((brand) => brand !== '');
};

/** POST /v1/checkouts: asks OPP for a checkout id the client UI is opened with. */
export const createCheckout = async (
  ctx: HyperPayContext,
  request: GatewayCheckoutRequest,
): Promise<PaymentSession> => {
  const brands = brandsFor(ctx.settings, request.method);
  const response = await ctx.client.post(HYPERPAY_PATHS.checkouts, checkoutForm(ctx, request));
  const body = parseWith(checkoutSchema, response, 'checkout');
  const { code, description } = body.result;
  if (!CHECKOUT_CREATED_PATTERN.test(code)) {
    assertNotRequestError(code, description);
    throw new PaymentSdkError(ERROR_CODES.VENDOR_ERROR, 'gateway did not create the checkout', {
      details: { resultCode: code, resultDescription: description },
    });
  }
  const integrity = typeof body.integrity === 'string' ? body.integrity : undefined;
  const { checkoutPageUrl } = ctx.settings;
  return {
    sessionId: body.id,
    status: 'PENDING',
    amountFils: request.amountFils,
    currency: request.currency,
    reference: request.reference,
    client: {
      provider: ctx.provider,
      environment: ctx.environment,
      checkoutId: body.id,
      brands,
      shopperResultUrl: ctx.settings.shopperResultUrl,
      widgetScriptUrl: `${ctx.settings.baseUrl}${HYPERPAY_PATHS.widgetScript(body.id)}`,
      ...(checkoutPageUrl === undefined
        ? {}
        : { checkoutUrl: `${checkoutPageUrl}${encodeURIComponent(body.id)}` }),
      ...(integrity === undefined ? {} : { integrity }),
    },
  };
};

/** Normalizes an OPP payment object (or the "no payment yet" answer) into a verification. */
export const toVerification = (
  ctx: HyperPayContext,
  sessionId: string,
  response: HyperPayResponse,
): PaymentVerification => {
  const body = parseWith(paymentSchema, response, 'payment');
  const { code, description } = body.result;
  const category = classifyResult(code);
  if (category !== 'NO_PAYMENT') assertNotRequestError(code, description);
  const status = paymentStatusOf(category);
  if (status === 'SUCCEEDED' && body.currency !== ctx.currency) {
    throw new PaymentSdkError(ERROR_CODES.MALFORMED_RESPONSE, 'gateway currency does not match');
  }
  const amountFils = body.amount === undefined ? 0 : decimalToFils(body.amount, ctx.currency);
  return {
    sessionId,
    status,
    amountFils,
    gatewayCode: code,
    gatewayMessage: description,
    ...(body.id === undefined ? {} : { paymentId: body.id }),
    ...(body.merchantTransactionId === undefined ? {} : { reference: body.merchantTransactionId }),
    raw: redact(response.json),
  };
};

/** GET /v1/checkouts/{id}/payment: the server-side source of truth for a checkout. */
export const fetchPayment = async (
  ctx: HyperPayContext,
  sessionId: string,
): Promise<PaymentVerification> =>
  toVerification(ctx, sessionId, await ctx.client.get(HYPERPAY_PATHS.checkoutPayment(sessionId)));
