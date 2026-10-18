import type {
  CurrencyCode,
  Environment,
  PaymentStatus,
  ProviderName,
  RefundStatus,
} from './constants/defaults';

export interface CustomerInfo {
  readonly email?: string;
  readonly givenName?: string;
  readonly surname?: string;
  /** E.164, e.g. `+962791234567`. */
  readonly phone?: string;
  readonly ip?: string;
}

/** Phase 2 (split payments): where part of an amount settles. Ignored by Phase 1 gateways. */
export interface PaymentDestination {
  readonly subMerchantId: string;
  readonly amountFils: number;
}

export interface CreateSessionRequest {
  /** One checkout = one key; repeating it returns the same session. */
  readonly idempotencyKey: string;
  /** Integer fils, greater than zero. */
  readonly amountFils: number;
  /** Our own reference for the attempt (becomes the gateway's merchant transaction id). */
  readonly reference: string;
  readonly currency?: CurrencyCode;
  readonly customer?: CustomerInfo;
  /** One of the enabled methods (`options.methods`). */
  readonly method?: string;
  readonly destinations?: readonly PaymentDestination[];
}

/** What a client needs to show the gateway's payment UI. The result is never trusted: verify on the server. */
export interface ClientCheckout {
  readonly provider: ProviderName;
  readonly environment: Environment;
  readonly checkoutId: string;
  /** Payment brands to offer (HyperPay: `VISA MASTER` -> `['VISA', 'MASTER']`). */
  readonly brands: readonly string[];
  /** Where the checkout returns the shopper (app scheme or https). */
  readonly shopperResultUrl: string;
  /** Hosted pay page (only the local mock gateway has one; real HyperPay uses its SDK/widget). */
  readonly checkoutUrl?: string;
  /** COPYandPAY widget script for web views. */
  readonly widgetScriptUrl?: string;
  /** Subresource-integrity hash of the widget script when the gateway provides one. */
  readonly integrity?: string;
}

export interface PaymentSession {
  readonly sessionId: string;
  readonly status: PaymentStatus;
  readonly amountFils: number;
  readonly currency: CurrencyCode;
  readonly reference: string;
  readonly client: ClientCheckout;
}

/** The gateway's answer, normalized, with its raw code kept for the admin attempt log (PAY-08). */
export interface PaymentVerification {
  readonly sessionId: string;
  readonly status: PaymentStatus;
  readonly amountFils: number;
  readonly gatewayCode: string;
  readonly gatewayMessage: string;
  /** The gateway's id of the captured payment (needed to refund later). */
  readonly paymentId?: string;
  readonly reference?: string;
  /** Gateway fee in fils when the gateway reports one. */
  readonly feeFils?: number;
  /** Redacted raw gateway answer for logs. */
  readonly raw: unknown;
}

export interface RefundRequest {
  readonly idempotencyKey: string;
  readonly sessionId: string;
  /** Integer fils; partial refunds add up to at most the captured amount. */
  readonly amountFils: number;
  /** Phase 2: charge the refund to this sub-merchant's balance (needs `splitPayments`). */
  readonly subMerchantId?: string;
}

export interface RefundResult {
  readonly refundId: string;
  readonly sessionId: string;
  readonly status: RefundStatus;
  readonly amountFils: number;
  readonly gatewayCode: string;
  readonly gatewayMessage: string;
  readonly raw: unknown;
}

export interface WebhookInput {
  /** The body exactly as received: authenticity is checked on it. */
  readonly rawBody: string;
  /** Primary signature header value (HyperPay: the authentication tag). */
  readonly signature: string;
  /** All request headers (lower-case names) for schemes that need more than one. */
  readonly headers?: Readonly<Record<string, string | undefined>>;
}

export interface PaymentWebhookEvent {
  /** `IGNORED`: an authentic notification of a type this SDK does not handle (acknowledge it). */
  readonly kind: 'PAYMENT' | 'REFUND' | 'IGNORED';
  readonly sessionId: string;
  readonly status: PaymentStatus;
  readonly gatewayCode: string;
  readonly gatewayMessage: string;
  readonly paymentId?: string;
  readonly reference?: string;
  readonly amountFils?: number;
  /** Set when `kind` is `REFUND`. */
  readonly refundStatus?: RefundStatus;
  /** Stable id of this notification for replay protection. */
  readonly eventId: string;
  /** True when this exact notification was already handled: skip side effects. */
  readonly replayed: boolean;
}

/** What an adapter returns; the facade adds `replayed`. */
export type GatewayWebhookEvent = Omit<PaymentWebhookEvent, 'replayed'>;

/**
 * The stable port consumers call. A declined payment is a normal result (`status: FAILED`); an
 * unverifiable webhook throws `PAYMENT_WEBHOOK_INVALID`; refunding more than was captured throws
 * `PAYMENT_REFUND_EXCEEDS`; a gateway outage throws a retryable `PaymentSdkError`.
 */
export interface PaymentProvider {
  /** What the configured gateway can do (Phase 2 features are `false` in Phase 1). */
  readonly capabilities: GatewayCapabilities;
  readonly createSession: (request: CreateSessionRequest) => Promise<PaymentSession>;
  /**
   * The client-side checkout data of an existing session, rebuilt without any network call (so a
   * resumed attempt can be handed to the app again). `integrity` is only known at creation.
   */
  readonly clientCheckout: (sessionId: string, method?: string) => ClientCheckout;
  readonly verify: (sessionId: string) => Promise<PaymentVerification>;
  readonly refund: (request: RefundRequest) => Promise<RefundResult>;
  readonly getRefund: (refundId: string) => Promise<RefundResult>;
  /** Authenticates the webhook, then maps it to a normalized event. */
  readonly handleWebhook: (input: WebhookInput) => Promise<PaymentWebhookEvent>;
  readonly cancelSession?: (sessionId: string) => Promise<void>;
  /** Releases connections held by the adapter. */
  readonly close: () => Promise<void>;
}

export interface GatewayCapabilities {
  readonly partialRefunds: boolean;
  /** Phase 2: charge-time split to sub-merchants. */
  readonly splitPayments: boolean;
  readonly webhooks: boolean;
  readonly cancelSession: boolean;
}

export interface GatewayCheckoutRequest {
  readonly idempotencyKey: string;
  readonly amountFils: number;
  readonly currency: CurrencyCode;
  readonly reference: string;
  readonly method: string;
  readonly customer?: CustomerInfo;
  readonly destinations?: readonly PaymentDestination[];
}

export interface GatewayRefundRequest {
  readonly idempotencyKey: string;
  readonly sessionId: string;
  readonly amountFils: number;
  readonly currency: CurrencyCode;
  readonly subMerchantId?: string;
}

/** What an adapter implements. Validation, idempotency, retries and logging live in the facade. */
export interface PaymentGateway {
  readonly name: string;
  readonly capabilities: GatewayCapabilities;
  readonly createCheckout: (request: GatewayCheckoutRequest) => Promise<PaymentSession>;
  readonly clientCheckout: (sessionId: string, method: string) => ClientCheckout;
  readonly fetchPayment: (sessionId: string) => Promise<PaymentVerification>;
  readonly refund: (request: GatewayRefundRequest) => Promise<RefundResult>;
  readonly fetchRefund: (refundId: string) => Promise<RefundResult>;
  readonly parseWebhook: (input: WebhookInput) => Promise<GatewayWebhookEvent>;
  readonly cancelSession?: (sessionId: string) => Promise<void>;
  readonly close?: () => Promise<void>;
}
