import type { Redis } from 'ioredis';
import {
  createPayments,
  ERROR_CODES as SDK_ERRORS,
  isPaymentSdkError,
  RedisIdempotencyStore,
  RedisSessionDirectory,
  type PaymentProvider as SdkPaymentProvider,
  type PaymentsOptions,
  type PaymentStatus as SdkPaymentStatus,
  type RefundStatus as SdkRefundStatus,
} from '@wab/payments';
import type { PaymentSettings } from '../../config';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { PaymentStatus, RefundStatus } from '../../constants/providers';
import { ExternalServiceError, PaymentError, UnauthorizedError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { toRedisLike, toSdkLogger } from '../notifier/real';
import type {
  CreateSessionRequest,
  PaymentClientCheckout,
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  PaymentWebhookEvent,
  RefundRequest,
  RefundResult,
  WebhookInput,
} from './types';

/** Payment provider backed by the `@wab/payments` SDK (HyperPay); `close` releases its connections. */
export interface ClosablePaymentProvider extends PaymentProvider {
  close(): Promise<void>;
}

export interface RealPaymentsDeps {
  readonly settings: PaymentSettings;
  readonly redis: Redis;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the SDK factory (tests). */
  readonly build?: (options: PaymentsOptions) => SdkPaymentProvider;
}

/** Which call failed: the same SDK error means different things for a refund and for a checkout. */
type Operation = 'session' | 'verify' | 'refund' | 'webhook';

/** SDK errors that mean the caller sent something invalid: a bug here, not a gateway outage. */
const CALLER_ERRORS: readonly string[] = [
  SDK_ERRORS.CONFIG_INVALID,
  SDK_ERRORS.VALIDATION_FAILED,
  SDK_ERRORS.METHOD_UNSUPPORTED,
  SDK_ERRORS.FEATURE_UNSUPPORTED,
  SDK_ERRORS.DUPLICATE,
];

/**
 * The unknown outcomes of the SDK never count as success: a payment stays pending until the
 * reconciliation job gets a definite answer, a refund stays pending until it is settled.
 */
export const toPaymentStatus = (status: SdkPaymentStatus): PaymentStatus =>
  status === 'UNKNOWN' ? 'PENDING' : status;
export const toRefundStatus = (status: SdkRefundStatus): RefundStatus =>
  status === 'UNKNOWN' ? 'REFUND_PENDING' : status;

/** Gateway failures become typed errors; vendor text never reaches a client. */
export const mapSdkError = (error: unknown, operation: Operation): never => {
  if (!isPaymentSdkError(error)) throw error;
  if (error.code === SDK_ERRORS.WEBHOOK_INVALID) throw new UnauthorizedError();
  if (error.code === SDK_ERRORS.REFUND_EXCEEDS) throw new PaymentError();
  if (operation === 'refund' && error.code === SDK_ERRORS.VALIDATION_FAILED) {
    throw new PaymentError({ code: ERROR_CODES.PAYMENT_NOT_VERIFIED });
  }
  if (CALLER_ERRORS.includes(error.code)) {
    throw new RangeError(`payment request rejected: ${error.code}`);
  }
  throw new ExternalServiceError({
    cause: error,
    unavailable: error.retryable || error.code === SDK_ERRORS.DUPLICATE_IN_PROGRESS,
  });
};

const toClient = (client: {
  readonly provider: string;
  readonly environment: 'dev' | 'prod';
  readonly checkoutId: string;
  readonly brands: readonly string[];
  readonly shopperResultUrl: string;
  readonly checkoutUrl?: string;
  readonly widgetScriptUrl?: string;
  readonly integrity?: string;
}): PaymentClientCheckout => ({ ...client });

export const buildSdkOptions = (
  settings: PaymentSettings,
  deps: Pick<RealPaymentsDeps, 'redis' | 'logger' | 'isProduction'>,
): PaymentsOptions => {
  const redis = toRedisLike(deps.redis);
  const common = {
    environment: deps.isProduction ? ('prod' as const) : ('dev' as const),
    idempotency: { store: new RedisIdempotencyStore(redis) },
    directory: new RedisSessionDirectory(redis),
    logger: toSdkLogger(deps.logger),
  };
  const webhook =
    settings.webhookKey === undefined ? {} : { webhookDecryptionKey: settings.webhookKey };
  if (settings.gateway === 'mock-gateway') {
    return {
      ...common,
      provider: 'mock-gateway',
      mockGateway: {
        baseUrl: settings.baseUrl ?? '',
        entityId: settings.entityId,
        accessToken: settings.accessToken,
        shopperResultUrl: settings.returnUrl,
        ...webhook,
      },
    };
  }
  return {
    ...common,
    provider: 'hyperpay',
    hyperpay: {
      entityId: settings.entityId,
      accessToken: settings.accessToken,
      shopperResultUrl: settings.returnUrl,
      ...(settings.baseUrl === undefined ? {} : { baseUrl: settings.baseUrl }),
      ...(settings.testMode === undefined ? {} : { testMode: settings.testMode }),
      ...webhook,
    },
  };
};

export const createRealPayments = (deps: RealPaymentsDeps): ClosablePaymentProvider => {
  const sdk = (deps.build ?? createPayments)(buildSdkOptions(deps.settings, deps));
  const guard = async <T>(operation: Operation, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      return mapSdkError(error, operation);
    }
  };
  return {
    createSession: (request: CreateSessionRequest): Promise<PaymentSession> =>
      guard('session', async () => {
        const session = await sdk.createSession({
          idempotencyKey: request.idempotencyKey,
          amountFils: request.amountFils,
          reference: request.reference,
        });
        return {
          sessionId: session.sessionId,
          status: toPaymentStatus(session.status),
          amountFils: session.amountFils,
          reference: session.reference,
          client: toClient(session.client),
        };
      }),
    verify: (sessionId: string): Promise<PaymentVerification> =>
      guard('verify', async () => {
        const result = await sdk.verify(sessionId);
        return {
          sessionId: result.sessionId,
          status: toPaymentStatus(result.status),
          amountFils: result.amountFils,
          gatewayCode: result.gatewayCode,
          gatewayMessage: result.gatewayMessage,
          ...(result.feeFils === undefined ? {} : { feeFils: result.feeFils }),
        };
      }),
    refund: (request: RefundRequest): Promise<RefundResult> =>
      guard('refund', async () => toRefundResult(await sdk.refund(request))),
    getRefund: (refundId: string): Promise<RefundResult> =>
      guard('refund', async () => toRefundResult(await sdk.getRefund(refundId))),
    handleWebhook: (input: WebhookInput): Promise<PaymentWebhookEvent> =>
      guard('webhook', async () => {
        const event = await sdk.handleWebhook({
          rawBody: input.rawBody,
          signature: input.signature,
          ...(input.headers === undefined ? {} : { headers: input.headers }),
        });
        return {
          kind: event.kind,
          replayed: event.replayed,
          sessionId: event.sessionId,
          status: toPaymentStatus(event.status),
          gatewayCode: event.gatewayCode,
          gatewayMessage: event.gatewayMessage,
        };
      }),
    clientCheckout: (sessionId: string): PaymentClientCheckout =>
      toClient(sdk.clientCheckout(sessionId)),
    close: () => sdk.close(),
  };
};

const toRefundResult = (result: {
  readonly refundId: string;
  readonly sessionId: string;
  readonly status: SdkRefundStatus;
  readonly amountFils: number;
  readonly gatewayCode: string;
  readonly gatewayMessage: string;
}): RefundResult => ({
  refundId: result.refundId,
  sessionId: result.sessionId,
  status: toRefundStatus(result.status),
  amountFils: result.amountFils,
  gatewayCode: result.gatewayCode,
  gatewayMessage: result.gatewayMessage,
});
