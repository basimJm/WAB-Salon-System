import { ERROR_CODES } from '../constants/codes';
import { PaymentSdkError } from '../errors';

export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: string;
}

/** The one network seam of the SDK: replace it for proxies, tracing or tests. */
export type HttpClient = (request: HttpRequest) => Promise<HttpResponse>;

/** Default client: global `fetch` with a hard timeout; transport failures become retryable errors. */
export const fetchHttpClient: HttpClient = async (request) => {
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body === undefined ? {} : { body: request.body }),
      signal: AbortSignal.timeout(request.timeoutMs),
    });
    return { status: response.status, body: await response.text() };
  } catch (cause) {
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
    throw new PaymentSdkError(
      timedOut ? ERROR_CODES.TIMEOUT : ERROR_CODES.NETWORK_ERROR,
      timedOut ? 'gateway request timed out' : 'gateway is unreachable',
      { retryable: true, cause },
    );
  }
};
