import { z } from 'zod';
import {
  FAKE_GATEWAY_CODES,
  FAKE_WEBHOOK_SIGNATURE,
  PAYMENT_REFERENCE_PATTERN,
  PAYMENT_STATUSES,
  type FakePaymentScenario,
  type FakeRefundScenario,
  type PaymentStatus,
} from '../../constants/providers';
import { ERROR_CODES } from '../../constants/errorCodes';
import { UnauthorizedError, PaymentError } from '../../utils/errors';
import { assertFils } from '../../utils/money';
import { IdempotencyStore } from '../idempotency';
import { assertIdempotencyKey } from '../notifier/validation';
import type {
  CreateSessionRequest,
  PaymentProvider,
  PaymentSession,
  PaymentVerification,
  PaymentWebhookEvent,
  RefundRequest,
  RefundResult,
  WebhookInput,
} from './types';

interface StoredSession {
  readonly sessionId: string;
  readonly reference: string;
  readonly amountFils: number;
  status: PaymentStatus;
  gatewayCode: string;
  gatewayMessage: string;
  refundedFils: number;
}

const webhookSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(PAYMENT_STATUSES),
  gatewayCode: z.string().min(1),
  gatewayMessage: z.string(),
});

const OUTCOMES: Record<
  FakePaymentScenario,
  { status: PaymentStatus; code: string; message: string }
> = {
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

export const fakeWebhookBody = (event: PaymentWebhookEvent): string => JSON.stringify(event);

/**
 * In-memory gateway for dev/test (production config refuses it). The next session follows the
 * scenario set with `scenarioForNextSession` (default `success`); a `pending` session stays
 * pending until `settle` is called, like a slow bank. Refunds follow `scenarioForNextRefund`.
 */
export class FakePaymentProvider implements PaymentProvider {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly refunds = new Map<string, RefundResult>();
  private readonly createStore = new IdempotencyStore<PaymentSession>();
  private readonly refundStore = new IdempotencyStore<RefundResult>();
  private nextSessionScenario: FakePaymentScenario = 'success';
  private nextRefundScenario: FakeRefundScenario = 'success';
  private sessionCount = 0;
  private refundCount = 0;

  scenarioForNextSession(scenario: FakePaymentScenario): void {
    this.nextSessionScenario = scenario;
  }

  scenarioForNextRefund(scenario: FakeRefundScenario): void {
    this.nextRefundScenario = scenario;
  }

  /** Test helper: a pending session gets its final result. */
  settle(sessionId: string, scenario: Exclude<FakePaymentScenario, 'pending'>): void {
    const session = this.require(sessionId);
    const outcome = OUTCOMES[scenario];
    session.status = outcome.status;
    session.gatewayCode = outcome.code;
    session.gatewayMessage = outcome.message;
  }

  /** Test helper: a pending refund gets its final result. */
  settleRefund(refundId: string, scenario: Exclude<FakeRefundScenario, 'pending'>): void {
    const refund = this.refunds.get(refundId);
    if (refund === undefined) throw new RangeError('unknown refund');
    const session = this.require(refund.sessionId);
    const done = scenario === 'success';
    if (done) session.refundedFils += refund.amountFils;
    this.refunds.set(refundId, {
      ...refund,
      status: done ? 'REFUNDED' : 'REFUND_FAILED',
      gatewayCode: done ? FAKE_GATEWAY_CODES.success : FAKE_GATEWAY_CODES.refundFail,
      gatewayMessage: done ? 'Refund processed' : 'Refund rejected',
    });
  }

  createSession(request: CreateSessionRequest): Promise<PaymentSession> {
    return this.guard(() => {
      assertIdempotencyKey(request.idempotencyKey);
      assertFils(request.amountFils);
      if (request.amountFils <= 0) throw new RangeError('amount must be greater than zero');
      if (!PAYMENT_REFERENCE_PATTERN.test(request.reference))
        throw new RangeError('invalid reference');
      return this.createStore.run(request.idempotencyKey, JSON.stringify(request), () => {
        this.sessionCount += 1;
        const outcome = OUTCOMES[this.nextSessionScenario];
        const session: StoredSession = {
          sessionId: `fake-session-${String(this.sessionCount)}`,
          reference: request.reference,
          amountFils: request.amountFils,
          status: outcome.status,
          gatewayCode: outcome.code,
          gatewayMessage: outcome.message,
          refundedFils: 0,
        };
        this.sessions.set(session.sessionId, session);
        return Promise.resolve(this.toSession(session));
      });
    });
  }

  verify(sessionId: string): Promise<PaymentVerification> {
    return this.guard(() => {
      const session = this.require(sessionId);
      return Promise.resolve({
        sessionId,
        status: session.status,
        amountFils: session.amountFils,
        gatewayCode: session.gatewayCode,
        gatewayMessage: session.gatewayMessage,
      });
    });
  }

  refund(request: RefundRequest): Promise<RefundResult> {
    return this.guard(() => {
      assertIdempotencyKey(request.idempotencyKey);
      assertFils(request.amountFils);
      if (request.amountFils <= 0) throw new RangeError('amount must be greater than zero');
      return this.refundStore.run(request.idempotencyKey, JSON.stringify(request), () => {
        const session = this.require(request.sessionId);
        if (session.status !== 'SUCCEEDED') {
          throw new PaymentError({ code: ERROR_CODES.PAYMENT_NOT_VERIFIED });
        }
        const pendingFils = [...this.refunds.values()]
          .filter((r) => r.sessionId === session.sessionId && r.status === 'REFUND_PENDING')
          .reduce((sum, r) => sum + r.amountFils, 0);
        if (session.refundedFils + pendingFils + request.amountFils > session.amountFils) {
          throw new PaymentError();
        }
        this.refundCount += 1;
        const scenario = this.nextRefundScenario;
        const refundId = `fake-refund-${String(this.refundCount)}`;
        const base = { refundId, sessionId: session.sessionId, amountFils: request.amountFils };
        let result: RefundResult;
        if (scenario === 'success') {
          session.refundedFils += request.amountFils;
          result = {
            ...base,
            status: 'REFUNDED',
            gatewayCode: FAKE_GATEWAY_CODES.success,
            gatewayMessage: 'Refund processed',
          };
        } else if (scenario === 'fail') {
          result = {
            ...base,
            status: 'REFUND_FAILED',
            gatewayCode: FAKE_GATEWAY_CODES.refundFail,
            gatewayMessage: 'Refund rejected',
          };
        } else {
          result = {
            ...base,
            status: 'REFUND_PENDING',
            gatewayCode: FAKE_GATEWAY_CODES.pending,
            gatewayMessage: 'Refund is being processed',
          };
        }
        this.refunds.set(refundId, result);
        return Promise.resolve(result);
      });
    });
  }

  getRefund(refundId: string): Promise<RefundResult> {
    return this.guard(() => {
      const refund = this.refunds.get(refundId);
      if (refund === undefined) throw new RangeError('unknown refund');
      return Promise.resolve(refund);
    });
  }

  handleWebhook({ rawBody, signature }: WebhookInput): Promise<PaymentWebhookEvent> {
    return this.guard(() => {
      if (signature !== FAKE_WEBHOOK_SIGNATURE) throw new UnauthorizedError();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new UnauthorizedError();
      }
      const event = webhookSchema.safeParse(parsed);
      if (!event.success) throw new UnauthorizedError();
      return Promise.resolve(event.data);
    });
  }

  private require(sessionId: string): StoredSession {
    const session = this.sessions.get(sessionId);
    if (session === undefined) throw new RangeError('unknown payment session');
    return session;
  }

  private toSession(session: StoredSession): PaymentSession {
    return {
      sessionId: session.sessionId,
      status: session.status,
      amountFils: session.amountFils,
      reference: session.reference,
    };
  }

  private guard<T>(work: () => Promise<T>): Promise<T> {
    try {
      return work();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
