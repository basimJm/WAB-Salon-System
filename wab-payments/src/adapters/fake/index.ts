import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ERROR_CODES } from '../../constants/codes';
import {
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  type CurrencyCode,
  type PaymentStatus,
  type RefundStatus,
} from '../../constants/defaults';
import { PaymentSdkError, validationError } from '../../errors';
import type {
  GatewayCapabilities,
  GatewayCheckoutRequest,
  GatewayRefundRequest,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentDestination,
  PaymentSession,
  PaymentVerification,
  RefundResult,
  WebhookInput,
} from '../../types';

export const FAKE_SCENARIOS = ['success', 'fail', 'cancel', 'pending'] as const;
export type FakeScenario = (typeof FAKE_SCENARIOS)[number];
export const FAKE_REFUND_SCENARIOS = ['success', 'fail', 'pending'] as const;
export type FakeRefundScenario = (typeof FAKE_REFUND_SCENARIOS)[number];

/** The only signature the fake accepts (dev and tests; prod config refuses the fake). */
export const FAKE_WEBHOOK_SIGNATURE = 'fake-webhook-signature';
export const FAKE_GATEWAY_CODES = {
  success: '000.100.110',
  pending: '000.200.000',
  fail: '800.100.151',
  cancel: '100.396.101',
  refundFail: '800.100.100',
} as const;

interface Outcome {
  readonly status: PaymentStatus;
  readonly code: string;
  readonly message: string;
}
const OUTCOMES: Record<FakeScenario, Outcome> = {
  success: {
    status: 'SUCCEEDED',
    code: FAKE_GATEWAY_CODES.success,
    message: 'Request successfully processed',
  },
  fail: { status: 'FAILED', code: FAKE_GATEWAY_CODES.fail, message: 'Card declined' },
  cancel: {
    status: 'CANCELLED',
    code: FAKE_GATEWAY_CODES.cancel,
    message: 'Cancelled by the user',
  },
  pending: {
    status: 'PENDING',
    code: FAKE_GATEWAY_CODES.pending,
    message: 'Waiting for the result',
  },
};

interface StoredSession {
  readonly sessionId: string;
  readonly reference: string;
  readonly amountFils: number;
  readonly currency: CurrencyCode;
  outcome: Outcome;
  refundedFils: number;
}

const webhookSchema = z.object({
  kind: z.enum(['PAYMENT', 'REFUND']).default('PAYMENT'),
  sessionId: z.string().min(1),
  status: z.enum(PAYMENT_STATUSES),
  gatewayCode: z.string().min(1),
  gatewayMessage: z.string(),
  refundStatus: z.enum(REFUND_STATUSES).optional(),
});

const invalidWebhook = (reason: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.WEBHOOK_INVALID, reason);

/** A fake gateway's webhook as `{ rawBody, signature }` (what the HTTP route would pass in). */
export const fakeWebhook = (
  event: z.input<typeof webhookSchema>,
): { rawBody: string; signature: string } => ({
  rawBody: JSON.stringify(event),
  signature: FAKE_WEBHOOK_SIGNATURE,
});

/**
 * In-memory gateway for dev/tests. The next session follows `scenarioForNextSession` (default
 * `success`); a `pending` one stays pending until `settle`. Failures can be injected to exercise
 * retries.
 */
export class FakeGateway implements PaymentGateway {
  readonly name = 'fake';
  readonly capabilities: GatewayCapabilities;
  /** Phase 2 records: what was split per session and which refunds hit a sub-merchant. */
  readonly destinations = new Map<string, readonly PaymentDestination[]>();
  readonly refundSubMerchants = new Map<string, string>();
  readonly sessions = new Map<string, StoredSession>();
  readonly refunds = new Map<string, RefundResult>();
  /** Counts of gateway calls, so tests can prove idempotency (one charge per key). */
  readonly calls = { createCheckout: 0, refund: 0 };
  constructor(options: { readonly splitPayments?: boolean } = {}) {
    this.capabilities = {
      partialRefunds: true,
      splitPayments: options.splitPayments ?? false,
      webhooks: true,
      cancelSession: true,
    };
  }

  private nextSession: FakeScenario = 'success';
  private nextRefund: FakeRefundScenario = 'success';
  private failures: PaymentSdkError[] = [];
  private sessionCount = 0;
  private refundCount = 0;

  scenarioForNextSession(scenario: FakeScenario): void {
    this.nextSession = scenario;
  }

  scenarioForNextRefund(scenario: FakeRefundScenario): void {
    this.nextRefund = scenario;
  }

  /** The next gateway calls throw these errors, in order, before working again. */
  injectFailures(...errors: PaymentSdkError[]): void {
    this.failures = [...errors];
  }

  /** A pending session receives its final result. */
  settle(sessionId: string, scenario: Exclude<FakeScenario, 'pending'>): void {
    this.require(sessionId).outcome = OUTCOMES[scenario];
  }

  settleRefund(refundId: string, scenario: Exclude<FakeRefundScenario, 'pending'>): void {
    const refund = this.refunds.get(refundId);
    if (refund === undefined) throw new RangeError('unknown refund');
    const done = scenario === 'success';
    if (done) this.require(refund.sessionId).refundedFils += refund.amountFils;
    this.refunds.set(refundId, {
      ...refund,
      status: done ? 'REFUNDED' : 'REFUND_FAILED',
      gatewayCode: done ? FAKE_GATEWAY_CODES.success : FAKE_GATEWAY_CODES.refundFail,
      gatewayMessage: done ? 'Refund processed' : 'Refund rejected',
    });
  }

  createCheckout(request: GatewayCheckoutRequest): Promise<PaymentSession> {
    return this.run(() => {
      this.calls.createCheckout += 1;
      this.sessionCount += 1;
      const stored: StoredSession = {
        sessionId: `fake-session-${String(this.sessionCount)}`,
        reference: request.reference,
        amountFils: request.amountFils,
        currency: request.currency,
        outcome: OUTCOMES[this.nextSession],
        refundedFils: 0,
      };
      this.sessions.set(stored.sessionId, stored);
      if (request.destinations !== undefined)
        this.destinations.set(stored.sessionId, request.destinations);
      return {
        sessionId: stored.sessionId,
        status: stored.outcome.status,
        amountFils: stored.amountFils,
        currency: stored.currency,
        reference: stored.reference,
        client: {
          provider: 'fake',
          environment: 'dev',
          checkoutId: stored.sessionId,
          brands: ['VISA', 'MASTER'],
          shopperResultUrl: 'fake://payment/result',
        },
      };
    });
  }

  fetchPayment(sessionId: string): Promise<PaymentVerification> {
    return this.run(() => {
      const session = this.require(sessionId);
      return {
        sessionId,
        status: session.outcome.status,
        amountFils: session.amountFils,
        gatewayCode: session.outcome.code,
        gatewayMessage: session.outcome.message,
        paymentId: `fake-payment-${sessionId}`,
        reference: session.reference,
        raw: { fake: true, code: session.outcome.code },
      };
    });
  }

  refund(request: GatewayRefundRequest): Promise<RefundResult> {
    return this.run(() => {
      this.calls.refund += 1;
      const session = this.require(request.sessionId);
      if (session.outcome.status !== 'SUCCEEDED') {
        throw validationError('only a succeeded payment can be refunded');
      }
      const pending = [...this.refunds.values()]
        .filter((r) => r.sessionId === session.sessionId && r.status === 'REFUND_PENDING')
        .reduce((sum, r) => sum + r.amountFils, 0);
      if (session.refundedFils + pending + request.amountFils > session.amountFils) {
        throw new PaymentSdkError(ERROR_CODES.REFUND_EXCEEDS, 'refund exceeds the captured amount');
      }
      this.refundCount += 1;
      const refundId = `fake-refund-${String(this.refundCount)}`;
      const base = {
        refundId,
        sessionId: session.sessionId,
        amountFils: request.amountFils,
        raw: { fake: true },
      };
      const result = this.refundOutcome(base, this.nextRefund);
      if (result.status === 'REFUNDED') session.refundedFils += request.amountFils;
      this.refunds.set(refundId, result);
      if (request.subMerchantId !== undefined)
        this.refundSubMerchants.set(refundId, request.subMerchantId);
      return result;
    });
  }

  fetchRefund(refundId: string): Promise<RefundResult> {
    return this.run(() => {
      const refund = this.refunds.get(refundId);
      if (refund === undefined) {
        throw new PaymentSdkError(ERROR_CODES.REFUND_NOT_FOUND, 'unknown refund');
      }
      return refund;
    });
  }

  parseWebhook(input: WebhookInput): Promise<GatewayWebhookEvent> {
    return this.run(() => {
      if (input.signature !== FAKE_WEBHOOK_SIGNATURE) throw invalidWebhook('bad signature');
      let json: unknown;
      try {
        json = JSON.parse(input.rawBody);
      } catch {
        throw invalidWebhook('body is not JSON');
      }
      const parsed = webhookSchema.safeParse(json);
      if (!parsed.success) throw invalidWebhook('body is not a payment event');
      const { refundStatus, ...rest } = parsed.data;
      return {
        ...rest,
        ...(refundStatus === undefined ? {} : { refundStatus }),
        eventId: createHash('sha256').update(input.rawBody).digest('hex'),
      };
    });
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  cancelSession(sessionId: string): Promise<void> {
    return this.run(() => {
      const session = this.require(sessionId);
      if (session.outcome.status === 'PENDING') session.outcome = OUTCOMES.cancel;
    });
  }

  private refundOutcome(
    base: Pick<RefundResult, 'refundId' | 'sessionId' | 'amountFils' | 'raw'>,
    scenario: FakeRefundScenario,
  ): RefundResult {
    const table: Record<
      FakeRefundScenario,
      { status: RefundStatus; code: string; message: string }
    > = {
      success: {
        status: 'REFUNDED',
        code: FAKE_GATEWAY_CODES.success,
        message: 'Refund processed',
      },
      fail: {
        status: 'REFUND_FAILED',
        code: FAKE_GATEWAY_CODES.refundFail,
        message: 'Refund rejected',
      },
      pending: {
        status: 'REFUND_PENDING',
        code: FAKE_GATEWAY_CODES.pending,
        message: 'Refund is being processed',
      },
    };
    const { status, code, message } = table[scenario];
    return { ...base, status, gatewayCode: code, gatewayMessage: message };
  }

  private require(sessionId: string): StoredSession {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      throw new PaymentSdkError(ERROR_CODES.SESSION_NOT_FOUND, 'unknown session');
    }
    return session;
  }

  private run<T>(work: () => T): Promise<T> {
    const failure = this.failures.shift();
    if (failure !== undefined) return Promise.reject(failure);
    try {
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('fake gateway failure'));
    }
  }
}
