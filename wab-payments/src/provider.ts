import { ERROR_CODES } from './constants/codes';
import type { ResolvedConfig } from './config/options';
import { isPaymentSdkError, PaymentSdkError } from './errors';
import { fingerprintOf, type IdempotencyStore } from './idempotency';
import type { Logger } from './logger';
import { withRetry, type RetryDeps } from './retry';
import type {
  PaymentGateway,
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  PaymentWebhookEvent,
  RefundResult,
  RefundRequest,
  CreateSessionRequest,
  WebhookInput,
} from './types';
import {
  assertCurrency,
  assertRefundRequest,
  assertSessionId,
  assertSessionRequest,
  resolveMethod,
} from './validation';

export interface ProviderDeps {
  readonly gateway: PaymentGateway;
  readonly config: ResolvedConfig;
  readonly store: IdempotencyStore;
  readonly logger: Logger;
  readonly retryDeps: RetryDeps;
}

const SESSION_SCOPE = 'session:';
const REFUND_SCOPE = 'refund:';
const WEBHOOK_SCOPE = 'webhook:';

/** Anything an adapter throws that is not ours becomes a typed, non-retryable error. */
const typed = (error: unknown): PaymentSdkError =>
  isPaymentSdkError(error)
    ? error
    : new PaymentSdkError(ERROR_CODES.UNKNOWN, 'unexpected payment adapter failure', {
        cause: error,
      });

/**
 * The public provider: validates input, enforces idempotency and bounded retries, logs without
 * secrets, and delegates the vendor work to one `PaymentGateway`.
 */
export const createPaymentProvider = (deps: ProviderDeps): PaymentProvider => {
  const { gateway, config, store, logger, retryDeps } = deps;
  const safe = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      throw typed(error);
    }
  };
  /** Safe-to-repeat calls: retried on retryable failures. */
  const read = <T>(name: string, operation: () => Promise<T>): Promise<T> =>
    safe(() =>
      withRetry(operation, config.retry, retryDeps, (attempt, error) => {
        logger.warn('payment.retry', { operation: name, attempt, code: typed(error).code });
      }),
    );

  const cancel = gateway.cancelSession?.bind(gateway);

  return {
    createSession: (request: CreateSessionRequest): Promise<PaymentSession> =>
      safe(async () => {
        assertSessionRequest(request);
        assertCurrency(request.currency, config.currency);
        const method = resolveMethod(request.method, config.methods);
        const { idempotencyKey, ...rest } = request;
        const fingerprint = fingerprintOf({ ...rest, currency: config.currency, method });
        const session = await store.run(`${SESSION_SCOPE}${idempotencyKey}`, fingerprint, () =>
          read('createSession', () =>
            gateway.createCheckout({
              idempotencyKey,
              amountFils: request.amountFils,
              currency: config.currency,
              reference: request.reference,
              method,
              ...(request.customer === undefined ? {} : { customer: request.customer }),
              ...(request.destinations === undefined ? {} : { destinations: request.destinations }),
            }),
          ),
        );
        logger.info('payment.session.created', {
          sessionId: session.sessionId,
          status: session.status,
        });
        return session;
      }),

    verify: (sessionId: string): Promise<PaymentVerification> =>
      safe(async () => {
        assertSessionId(sessionId);
        const result = await read('verify', () => gateway.fetchPayment(sessionId));
        const level = result.status === 'UNKNOWN' ? 'warn' : 'info';
        logger[level]('payment.verified', {
          sessionId,
          status: result.status,
          code: result.gatewayCode,
          raw: result.status === 'UNKNOWN' ? result.raw : undefined,
        });
        return result;
      }),

    refund: (request: RefundRequest): Promise<RefundResult> =>
      safe(async () => {
        assertRefundRequest(request);
        const { idempotencyKey, ...rest } = request;
        // Never blind-retried: the adapter finds an earlier refund with this key before sending.
        const result = await store.run(
          `${REFUND_SCOPE}${idempotencyKey}`,
          fingerprintOf(rest),
          () => gateway.refund({ ...request, currency: config.currency }),
        );
        logger.info('payment.refund', { refundId: result.refundId, status: result.status });
        return result;
      }),

    getRefund: (refundId: string): Promise<RefundResult> =>
      safe(async () => {
        assertSessionId(refundId, 'refundId');
        return read('getRefund', () => gateway.fetchRefund(refundId));
      }),

    handleWebhook: (input: WebhookInput): Promise<PaymentWebhookEvent> =>
      safe(async () => {
        const state = { fresh: false };
        const event = await store.run(
          `${WEBHOOK_SCOPE}${fingerprintOf(input.rawBody)}`,
          fingerprintOf(input.rawBody),
          async () => {
            const parsed = await gateway.parseWebhook(input);
            state.fresh = true;
            return { ...parsed, replayed: false };
          },
        );
        logger.info('payment.webhook', { sessionId: event.sessionId, replayed: !state.fresh });
        return state.fresh ? event : { ...event, replayed: true };
      }),

    ...(cancel === undefined
      ? {}
      : {
          cancelSession: (sessionId: string): Promise<void> =>
            safe(async () => {
              assertSessionId(sessionId);
              await read('cancelSession', () => cancel(sessionId));
            }),
        }),

    close: async (): Promise<void> => {
      await gateway.close?.();
    },
  };
};
