/** Every tunable default lives here; consumers override them through options. */
export const ENVIRONMENTS = ['dev', 'prod'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const PROVIDERS = ['fake', 'mock-gateway', 'hyperpay', 'custom'] as const;
export type ProviderName = (typeof PROVIDERS)[number];
/** Providers that never move real money: refused in production. */
export const NON_PRODUCTION_PROVIDERS: readonly ProviderName[] = ['fake', 'mock-gateway'];

/** Normalized payment outcome. `UNKNOWN` is never success: the caller keeps the attempt open. */
export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const REFUND_STATUSES = ['REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED', 'UNKNOWN'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Currencies the SDK can format. Money is held as integer minor units (JOD: fils). */
export const CURRENCIES = {
  JOD: { decimals: 3, minorPerMajor: 1000 },
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;
export const DEFAULT_CURRENCY: CurrencyCode = 'JOD';
/** Decimal places gateways may be asked to receive (some want 2 even for 3-decimal currencies). */
export const GATEWAY_AMOUNT_DECIMALS = [2, 3] as const;
export type GatewayAmountDecimals = (typeof GATEWAY_AMOUNT_DECIMALS)[number];
/** Never more digits than this: protects against unsafe integers. */
export const MAX_AMOUNT_FILS = 100_000_000_000;

export const DEFAULT_METHODS: readonly string[] = ['CARD'];
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_.-]{8,128}$/;
/** Our own reference for an attempt (maps to the gateway's merchant transaction id). */
export const REFERENCE_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export const DEFAULT_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  /** Fraction of the delay randomised to avoid synchronised retries. */
  jitterRatio: 0.2,
} as const;

export const DEFAULT_IDEMPOTENCY = {
  ttlSec: 86_400,
  keyPrefix: 'wab:payments:idem:',
} as const;

export const DEFAULT_TIMEOUT_MS = 15_000;
export const MS_PER_SECOND = 1000;

/** Field names whose values are never logged (matched case-insensitively, separators ignored). */
export const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|authorization|cvv|cvc|card|expiry|holder|iban|signature|bearer|decryptionkey|apikey)|^(pan|iv|tag|key)$/i;
export const REDACTED = '[redacted]';
/** A run of 13-19 digits (optionally spaced/dashed) looks like a card number. */
export const CARD_NUMBER_PATTERN = /\b\d(?:[ -]?\d){12,18}\b/g;
export const MAX_REDACT_DEPTH = 6;
