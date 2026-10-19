import { randomUUID } from 'node:crypto';

/** HyperPay result codes the mock answers with (real codes from the OPP result-code reference). */
export const MOCK_CODES = {
  checkoutCreated: { code: '000.200.100', description: 'successfully created checkout' },
  success: {
    code: '000.100.110',
    description: "Request successfully processed in 'Merchant in Integrator Test Mode'",
  },
  pending: { code: '000.200.000', description: 'transaction pending' },
  declined: { code: '800.100.151', description: 'transaction declined (invalid card)' },
  cancelled: { code: '100.396.101', description: 'cancelled by user' },
  notFound: { code: '200.300.404', description: 'invalid or missing parameter' },
  authFailed: { code: '800.900.300', description: 'invalid authentication information' },
  badRequest: {
    code: '200.100.101',
    description: 'invalid Request Message (no valid query string)',
  },
  refundExceeds: {
    code: '700.400.200',
    description: 'cannot refund (refund volume exceeded or tx reversed)',
  },
  refundBadState: { code: '700.400.700', description: 'cannot refund (payment not captured)' },
  noTransaction: { code: '700.400.580', description: 'cannot find transaction' },
} as const;
export type MockResult = { readonly code: string; readonly description: string };

export const MOCK_OUTCOMES = ['success', 'fail', 'cancel', 'pending'] as const;
export type MockOutcome = (typeof MOCK_OUTCOMES)[number];
export type CheckoutOutcome = MockOutcome | 'unpaid';

export interface MockCheckout {
  readonly id: string;
  readonly entityId: string;
  readonly amount: string;
  readonly currency: string;
  readonly paymentType: string;
  readonly merchantTransactionId: string;
  readonly shopperResultUrl?: string;
  readonly createdAt: string;
  outcome: CheckoutOutcome;
  paymentId?: string;
}

export interface MockPayment {
  readonly id: string;
  readonly checkoutId?: string;
  /** Set on refunds: the payment they refund. */
  readonly referencedId?: string;
  readonly paymentType: string;
  readonly amount: string;
  readonly currency: string;
  readonly merchantTransactionId: string;
  readonly result: MockResult;
  readonly timestamp: string;
}

const RESULT_OF: Record<MockOutcome, MockResult> = {
  success: MOCK_CODES.success,
  fail: MOCK_CODES.declined,
  cancel: MOCK_CODES.cancelled,
  pending: MOCK_CODES.pending,
};

const PRECISION = 1000;
/** Amounts are compared as integer thousandths: no float drift. */
const toThousandths = (amount: string): number => Math.round(Number(amount) * PRECISION);

export interface MockStateOptions {
  readonly now?: () => Date;
  readonly newId?: () => string;
}

/** In-memory ledger of the mock gateway: checkouts, payments and refunds. */
export class MockState {
  readonly checkouts = new Map<string, MockCheckout>();
  readonly payments = new Map<string, MockPayment>();
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(options: MockStateOptions = {}) {
    this.now = options.now ?? ((): Date => new Date());
    this.newId = options.newId ?? ((): string => randomUUID().replaceAll('-', ''));
  }

  timestamp(): string {
    return this.now()
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '+0000');
  }

  createCheckout(input: Omit<MockCheckout, 'id' | 'createdAt' | 'outcome'>): MockCheckout {
    const checkout: MockCheckout = {
      ...input,
      id: `${this.newId()}.mock`,
      createdAt: this.timestamp(),
      outcome: 'unpaid',
    };
    this.checkouts.set(checkout.id, checkout);
    return checkout;
  }

  /** The shopper finished (or abandoned) the payment page. Returns the payment record. */
  complete(checkoutId: string, outcome: MockOutcome): MockPayment | undefined {
    const checkout = this.checkouts.get(checkoutId);
    if (checkout === undefined) return undefined;
    checkout.outcome = outcome;
    const existing =
      checkout.paymentId === undefined ? undefined : this.payments.get(checkout.paymentId);
    const payment: MockPayment = {
      id: existing?.id ?? this.newId(),
      checkoutId,
      paymentType: checkout.paymentType,
      amount: checkout.amount,
      currency: checkout.currency,
      merchantTransactionId: checkout.merchantTransactionId,
      result: RESULT_OF[outcome],
      timestamp: this.timestamp(),
    };
    checkout.paymentId = payment.id;
    this.payments.set(payment.id, payment);
    return payment;
  }

  paymentOfCheckout(checkoutId: string): MockPayment | undefined {
    const paymentId = this.checkouts.get(checkoutId)?.paymentId;
    return paymentId === undefined ? undefined : this.payments.get(paymentId);
  }

  /** Refunds a captured payment; the sum of refunds may not exceed the payment. */
  refund(
    paymentId: string,
    input: { amount: string; currency: string; merchantTransactionId: string },
  ): { payment: MockPayment } | { error: MockResult } {
    const original = this.payments.get(paymentId);
    if (original === undefined) return { error: MOCK_CODES.noTransaction };
    if (original.result.code !== MOCK_CODES.success.code)
      return { error: MOCK_CODES.refundBadState };
    const refunded = [...this.payments.values()]
      .filter((p) => p.referencedId === paymentId && p.result.code === MOCK_CODES.success.code)
      .reduce((sum, p) => sum + toThousandths(p.amount), 0);
    if (refunded + toThousandths(input.amount) > toThousandths(original.amount)) {
      return { error: MOCK_CODES.refundExceeds };
    }
    const payment: MockPayment = {
      id: this.newId(),
      referencedId: paymentId,
      paymentType: 'RF',
      amount: input.amount,
      currency: input.currency,
      merchantTransactionId: input.merchantTransactionId,
      result: MOCK_CODES.success,
      timestamp: this.timestamp(),
    };
    this.payments.set(payment.id, payment);
    return { payment };
  }

  byMerchantTransactionId(merchantTransactionId: string): MockPayment[] {
    return [...this.payments.values()].filter(
      (p) => p.merchantTransactionId === merchantTransactionId,
    );
  }
}
