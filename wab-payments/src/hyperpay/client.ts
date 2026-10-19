import { z } from 'zod';
import { ERROR_CODES, type ErrorCode } from '../constants/codes';
import type { ResolvedHyperPay } from '../config/options';
import { HYPERPAY_REQUEST_CONTENT_TYPE } from '../constants/hyperpay';
import { HTTP_STATUS } from '../constants/http';
import { PaymentSdkError } from '../errors';
import type { HttpClient } from '../http';
import { classifyResult, requestErrorOf } from './codes';

export interface HyperPayResponse {
  readonly status: number;
  readonly json: Readonly<Record<string, unknown>>;
}

const bodySchema = z.looseObject({
  result: z.looseObject({ code: z.string(), description: z.string().default('') }).optional(),
});

const fail = (
  code: ErrorCode,
  message: string,
  retryable: boolean,
  details: Record<string, unknown>,
): PaymentSdkError => new PaymentSdkError(code, message, { retryable, details });

/** Maps an error response (4xx/5xx) to a typed error; `resultCode` refines the 400 family. */
const errorFor = (status: number, resultCode: string | undefined): PaymentSdkError => {
  const details = { httpStatus: status, ...(resultCode === undefined ? {} : { resultCode }) };
  if (status === HTTP_STATUS.unauthorized || status === HTTP_STATUS.forbidden) {
    return fail(ERROR_CODES.AUTH_FAILED, 'gateway rejected the credentials', false, details);
  }
  if (status === HTTP_STATUS.requestTimeout) {
    return fail(ERROR_CODES.TIMEOUT, 'gateway timed out', true, details);
  }
  if (status === HTTP_STATUS.tooManyRequests) {
    return fail(ERROR_CODES.RATE_LIMITED, 'gateway rate limit', true, details);
  }
  if (status >= HTTP_STATUS.serverError) {
    return fail(ERROR_CODES.GATEWAY_UNAVAILABLE, 'gateway unavailable', true, details);
  }
  const mapped = resultCode === undefined ? undefined : requestErrorOf(classifyResult(resultCode));
  if (mapped !== undefined) {
    return fail(mapped.code, 'gateway rejected the request', mapped.retryable, details);
  }
  return fail(ERROR_CODES.VENDOR_ERROR, 'gateway rejected the request', false, details);
};

export interface HyperPayClient {
  get(path: string, query?: Record<string, string>): Promise<HyperPayResponse>;
  post(path: string, form: Record<string, string>): Promise<HyperPayResponse>;
}

/**
 * Thin OPP transport: bearer auth, form encoding, JSON parsing and the HTTP-status mapping.
 * 2xx and 404 answers are returned (the caller reads the result code); everything else throws.
 */
export const createHyperPayClient = (
  settings: ResolvedHyperPay,
  http: HttpClient,
  timeoutMs: number,
): HyperPayClient => {
  const send = async (
    method: 'GET' | 'POST',
    url: string,
    body?: string,
  ): Promise<HyperPayResponse> => {
    const response = await http({
      method,
      url,
      timeoutMs,
      headers: {
        authorization: `Bearer ${settings.accessToken}`,
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': HYPERPAY_REQUEST_CONTENT_TYPE }),
      },
      ...(body === undefined ? {} : { body }),
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.body);
    } catch {
      parsed = undefined;
    }
    const checked = bodySchema.safeParse(parsed);
    const ok = response.status >= HTTP_STATUS.ok && response.status < HTTP_STATUS.multipleChoices;
    if (!ok && response.status !== HTTP_STATUS.notFound) {
      throw errorFor(response.status, checked.success ? checked.data.result?.code : undefined);
    }
    if (!checked.success) {
      throw fail(ERROR_CODES.MALFORMED_RESPONSE, 'gateway answer is not valid JSON', false, {
        httpStatus: response.status,
      });
    }
    return { status: response.status, json: checked.data };
  };

  return {
    get: (path, query = {}) => {
      const params = new URLSearchParams({ entityId: settings.entityId, ...query });
      return send('GET', `${settings.baseUrl}${path}?${params.toString()}`);
    },
    post: (path, form) =>
      send(
        'POST',
        `${settings.baseUrl}${path}`,
        new URLSearchParams({ entityId: settings.entityId, ...form }).toString(),
      ),
  };
};
