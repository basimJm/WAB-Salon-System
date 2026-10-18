import { DEFAULT_RETRY } from '../../constants/defaults';
import { realRetryDeps, withRetry, type RetryDeps, type RetryPolicy } from '../../retry';
import type { EmailChannel, EmailRequest, EmailResult, Logger } from '../../types';
import { isRecipientRefusal, normalizeSmtpError } from './smtpErrors';

export interface MailMessage {
  readonly from: { readonly name: string; readonly address: string };
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

/** The slice of a nodemailer transport that we use (injectable for tests). */
export interface TransportLike {
  sendMail(
    message: MailMessage,
  ): Promise<{ accepted: readonly unknown[]; rejected: readonly unknown[] }>;
  close?(): void;
}

export interface SmtpChannelOptions {
  readonly transport: () => TransportLike;
  readonly from: { readonly name: string; readonly address: string };
  readonly logger: Logger;
  readonly retry?: RetryPolicy;
  readonly retryDeps?: RetryDeps;
}

/** nodemailer reports addresses either as strings or as `{ address }` objects. */
const addressOf = (entry: unknown): string => {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && 'address' in entry) {
    return String(entry.address);
  }
  return String(entry);
};

export class SmtpEmailChannel implements EmailChannel {
  private transport: TransportLike | undefined;
  private readonly retry: RetryPolicy;
  private readonly deps: RetryDeps;

  constructor(private readonly options: SmtpChannelOptions) {
    this.retry = options.retry ?? DEFAULT_RETRY;
    this.deps = options.retryDeps ?? realRetryDeps;
  }

  async send(request: EmailRequest): Promise<EmailResult> {
    const transport = (this.transport ??= this.options.transport());
    const message: MailMessage = {
      from: this.options.from,
      to: request.to,
      subject: request.subject,
      text: request.text,
      ...(request.html === undefined ? {} : { html: request.html }),
    };
    try {
      const info = await withRetry(
        async () => {
          try {
            return await transport.sendMail(message);
          } catch (error) {
            throw normalizeSmtpError(error);
          }
        },
        this.retry,
        this.deps,
        (attempt, error) => {
          this.options.logger.warn('smtp.retry', {
            attempt,
            code: error instanceof Error ? error.message : 'unknown',
          });
        },
      );
      return { accepted: info.accepted.map(addressOf), rejected: info.rejected.map(addressOf) };
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined;
      if (isRecipientRefusal(cause)) return { accepted: [], rejected: [...request.to] };
      throw error;
    }
  }

  close(): Promise<void> {
    this.transport?.close?.();
    this.transport = undefined;
    return Promise.resolve();
  }
}
