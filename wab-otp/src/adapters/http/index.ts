import { ERROR_CODES } from '../../constants/codes';
import { HTTP_STATUS, TIMEOUT_ERROR_NAMES } from '../../constants/http';
import { isOtpError, OtpError } from '../../errors';

/** The slice of `fetch` the HTTP channels need (tests, proxies and local mocks inject their own). */
export type FetchLike = (
  url: string,
  init: {
    readonly method: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body?: string;
    readonly signal: AbortSignal;
  },
) => Promise<{ readonly status: number; text(): Promise<string> }>;

export interface HttpRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs: number;
  /** Vendor name for error messages (`ARQAM`). */
  readonly vendor: string;
}

export interface HttpAnswer {
  readonly status: number;
  /** Parsed JSON, or `null` when the body is empty or not JSON. */
  readonly body: unknown;
}

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

export const isSuccess = (status: number): boolean =>
  status >= HTTP_STATUS.okFrom && status <= HTTP_STATUS.okTo;

export const asRecord = (value: unknown): Readonly<Record<string, unknown>> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** A fetch that produced no HTTP answer: timeout or network failure (both retryable). */
export const transportError = (error: unknown, vendor: string): OtpError => {
  if (isOtpError(error)) return error;
  // `AbortSignal.timeout` rejects with a DOMException that may come from another realm.
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  return (TIMEOUT_ERROR_NAMES as readonly string[]).includes(name)
    ? new OtpError(ERROR_CODES.TIMEOUT, `${vendor} request timed out`, {
        retryable: true,
        cause: error,
      })
    : new OtpError(ERROR_CODES.NETWORK_ERROR, `${vendor} unreachable`, {
        retryable: true,
        cause: error,
      });
};

/** One bounded HTTP call; any status is returned, only transport failures throw. */
export const sendHttp = async (fetch: FetchLike, request: HttpRequest): Promise<HttpAnswer> => {
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body === undefined ? {} : { body: request.body }),
      signal: AbortSignal.timeout(request.timeoutMs),
    });
    const text = await response.text();
    return { status: response.status, body: parseJson(text) };
  } catch (error) {
    throw transportError(error, request.vendor);
  }
};
