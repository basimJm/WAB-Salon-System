import { DEFAULT_BREVO, DEFAULT_RETRY, DEFAULT_TIMEOUTS } from '../../constants/defaults';
import { ERROR_CODES, HTTP_EMAIL_STATUS } from '../../constants/codes';
import { NotificationError } from '../../errors';
import { realRetryDeps, withRetry, type RetryDeps, type RetryPolicy } from '../../retry';
import type { EmailChannel, EmailRequest, EmailResult, Logger } from '../../types';
import { httpStatusError, httpTransportError } from './httpErrors';

/** The slice of `fetch` the adapter uses (injectable for tests and local mocks). */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

export interface BrevoChannelOptions {
  readonly apiKey: string;
  readonly from: { readonly name: string; readonly address: string };
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetch?: FetchLike;
  readonly logger: Logger;
  readonly retry?: RetryPolicy;
  readonly retryDeps?: RetryDeps;
}

/** Brevo answers `{ code, message }` on errors and `{ messageId }` on success. */
const parseBody = (text: string): Record<string, unknown> | null => {
  if (text === '') return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

/**
 * Transactional email over Brevo's HTTPS API (NOT-012): the same `EmailChannel` as SMTP, for hosts
 * that block SMTP ports. Every status maps to a typed error; 429/5xx/network/timeouts are retried.
 */
export class BrevoEmailChannel implements EmailChannel {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly fetcher: FetchLike;
  private readonly retry: RetryPolicy;
  private readonly deps: RetryDeps;

  constructor(private readonly options: BrevoChannelOptions) {
    this.url = `${options.baseUrl ?? DEFAULT_BREVO.baseUrl}${DEFAULT_BREVO.sendPath}`;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUTS.httpEmailMs;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.retry = options.retry ?? DEFAULT_RETRY;
    this.deps = options.retryDeps ?? realRetryDeps;
  }

  async send(request: EmailRequest): Promise<EmailResult> {
    const body = JSON.stringify({
      sender: { name: this.options.from.name, email: this.options.from.address },
      to: request.to.map((email) => ({ email })),
      subject: request.subject,
      textContent: request.text,
      ...(request.html === undefined ? {} : { htmlContent: request.html }),
    });
    await withRetry(
      () => this.post(body),
      this.retry,
      this.deps,
      (attempt, error) => {
        this.options.logger.warn('brevo.retry', {
          attempt,
          code: error instanceof NotificationError ? error.code : 'unknown',
        });
      },
    );
    // Brevo accepts or refuses the whole message; there is no per-recipient answer.
    return { accepted: [...request.to], rejected: [] };
  }

  private async post(body: string): Promise<void> {
    let status: number;
    let text: string;
    try {
      const response = await this.fetcher(this.url, {
        method: 'POST',
        headers: {
          [DEFAULT_BREVO.apiKeyHeader]: this.options.apiKey,
          accept: DEFAULT_BREVO.jsonContentType,
          'content-type': DEFAULT_BREVO.jsonContentType,
        },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      throw httpTransportError(error);
    }
    const parsed = parseBody(text);
    if ((HTTP_EMAIL_STATUS.accepted as readonly number[]).includes(status)) {
      if (parsed === null) {
        this.options.logger.warn('brevo.malformed', { status });
        throw new NotificationError(ERROR_CODES.MALFORMED_RESPONSE, 'email API answer unreadable', {
          details: { status },
        });
      }
      return;
    }
    const vendorCode = typeof parsed?.['code'] === 'string' ? parsed['code'] : null;
    const error = httpStatusError(status, vendorCode);
    if (error.code === ERROR_CODES.UNKNOWN) this.options.logger.error('brevo.unknown', { status });
    throw error;
  }
}
