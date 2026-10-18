import { DEFAULT_LIMITS, DEFAULT_RETRY, DEFAULT_TIMEOUTS } from '../../constants/defaults';
import { ERROR_CODES } from '../../constants/codes';
import { NotificationError } from '../../errors';
import {
  delayFor,
  realRetryDeps,
  withRetry,
  withTimeout,
  type RetryDeps,
  type RetryPolicy,
} from '../../retry';
import type { Logger, PushChannel, PushRequest, PushResult, PushTokenResult } from '../../types';
import { buildFcmMessage, type FcmBaseMessage } from './fcmMessage';
import { classifyTokenError, fcmCodeOf, normalizeFcmError, toTokenResult } from './fcmErrors';

export interface FcmBatchResponse {
  readonly responses: readonly {
    readonly success: boolean;
    readonly error?: { readonly code?: string; readonly message?: string } | undefined;
  }[];
}

/** The two firebase-admin `Messaging` methods used (injectable for tests and other vendors). */
export interface MessagingLike {
  send(message: FcmBaseMessage & { topic: string }, dryRun?: boolean): Promise<string>;
  sendEachForMulticast(
    message: FcmBaseMessage & { tokens: string[] },
    dryRun?: boolean,
  ): Promise<FcmBatchResponse>;
}

export interface FcmChannelOptions {
  readonly messaging: () => Promise<MessagingLike>;
  readonly logger: Logger;
  readonly retry?: RetryPolicy;
  readonly retryDeps?: RetryDeps;
  readonly batchSize?: number;
  readonly timeoutMs?: number;
  /** FCM validates the message but delivers nothing (dev smoke tests). */
  readonly dryRun?: boolean;
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    chunks.push(items.slice(index, index + size));
  return chunks;
};

/** Push through Firebase Cloud Messaging: topic sends and batched multicast with partial retry. */
export class FcmPushChannel implements PushChannel {
  private readonly retry: RetryPolicy;
  private readonly deps: RetryDeps;
  private readonly batchSize: number;
  private readonly timeoutMs: number;
  private readonly dryRun: boolean;

  constructor(private readonly options: FcmChannelOptions) {
    this.retry = options.retry ?? DEFAULT_RETRY;
    this.deps = options.retryDeps ?? realRetryDeps;
    this.batchSize = options.batchSize ?? DEFAULT_LIMITS.batchSize;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUTS.fcmMs;
    this.dryRun = options.dryRun ?? false;
  }

  async send(request: PushRequest): Promise<PushResult> {
    const base = buildFcmMessage(request.message);
    if ('topic' in request.target) return this.sendTopic(base, request.target.topic);
    return this.sendTokens(base, request.target.tokens);
  }

  private async sendTopic(base: FcmBaseMessage, topic: string): Promise<PushResult> {
    const messaging = await this.options.messaging();
    await withRetry(
      () => this.guard(() => messaging.send({ ...base, topic }, this.dryRun)),
      this.retry,
      this.deps,
      (attempt, error) => {
        this.options.logger.warn('fcm.topic.retry', { attempt, code: fcmCodeOf(error) });
      },
    );
    return { tokens: [], sent: 1, invalidTokens: [] };
  }

  /** Runs one vendor call with a timeout and typed errors. */
  private async guard<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await withTimeout(
        call(),
        this.timeoutMs,
        () =>
          new NotificationError(ERROR_CODES.TIMEOUT, 'FCM request timed out', { retryable: true }),
      );
    } catch (error) {
      throw normalizeFcmError(error);
    }
  }

  private async sendTokens(base: FcmBaseMessage, tokens: readonly string[]): Promise<PushResult> {
    const messaging = await this.options.messaging();
    const results = new Map<string, PushTokenResult>();
    let pending = [...tokens];
    let callError: NotificationError | undefined;

    for (let attempt = 1; pending.length > 0; attempt += 1) {
      const retryNext: string[] = [];
      callError = undefined;
      for (const batch of chunk(pending, this.batchSize)) {
        try {
          const response = await this.guard(() =>
            messaging.sendEachForMulticast({ ...base, tokens: batch }, this.dryRun),
          );
          retryNext.push(...this.applyResponse(batch, response, results));
        } catch (error) {
          const normalized = normalizeFcmError(error);
          if (!normalized.retryable) throw normalized;
          callError = normalized;
          retryNext.push(...batch);
        }
      }
      pending = retryNext;
      if (pending.length === 0 || attempt >= this.retry.maxAttempts) break;
      this.options.logger.warn('fcm.multicast.retry', { attempt, pending: pending.length });
      await this.deps.sleep(delayFor(attempt, this.retry, this.deps.random));
    }

    const delivered = [...results.values()].some((result) => result !== 'FAILED');
    if (pending.length > 0 && !delivered && callError !== undefined) throw callError;
    for (const token of pending) results.set(token, 'FAILED');
    return this.toResult(tokens, results);
  }

  /** Records per-token outcomes; returns the tokens worth retrying. */
  private applyResponse(
    batch: readonly string[],
    response: FcmBatchResponse,
    results: Map<string, PushTokenResult>,
  ): string[] {
    if (response.responses.length !== batch.length) {
      throw new NotificationError(
        ERROR_CODES.MALFORMED_RESPONSE,
        'FCM answered with a different number of results',
        { retryable: true },
      );
    }
    const retry: string[] = [];
    let payloadErrors = 0;
    batch.forEach((token, index) => {
      const entry = response.responses[index];
      if (entry?.success === true) {
        results.set(token, 'SENT');
        return;
      }
      const code = entry?.error?.code ?? '';
      const outcome = classifyTokenError(code, entry?.error?.message ?? '');
      if (outcome.kind === 'auth') {
        throw normalizeFcmError({ code: outcome.code });
      }
      if (outcome.kind === 'retry') {
        retry.push(token);
        return;
      }
      if (outcome.kind === 'payload') payloadErrors += 1;
      if (outcome.kind === 'failed') {
        this.options.logger.warn('fcm.token.unknown_error', { code });
      }
      results.set(token, toTokenResult(outcome));
    });
    if (payloadErrors === batch.length) {
      throw new NotificationError(ERROR_CODES.PAYLOAD_INVALID, 'FCM rejected the payload', {
        details: { vendorCode: 'messaging/invalid-argument' },
      });
    }
    return retry;
  }

  private toResult(tokens: readonly string[], results: Map<string, PushTokenResult>): PushResult {
    const entries = tokens.map((token) => ({
      token,
      result: results.get(token) ?? ('FAILED' as const),
    }));
    return {
      tokens: entries,
      sent: entries.filter((entry) => entry.result === 'SENT').length,
      invalidTokens: entries
        .filter((entry) => entry.result === 'INVALID_TOKEN')
        .map((e) => e.token),
    };
  }
}
