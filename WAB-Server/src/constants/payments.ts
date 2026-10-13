/** Payment attempts (SRV-083, BUSINESS_DOMAIN.md §3.5 `transactions`, §5.6 step 3). */
export const TRANSACTIONS_COLLECTION = 'transactions';
export const PAYMENT_CURRENCY = 'JOD';
export const PAYMENT_ROUTES = { base: '/payments', verify: '/:id/verify', byId: '/:id' } as const;
export const PAYMENT_RATE_LIMIT = { windowMs: 60_000, max: 60 } as const;
/** `idempotencyKey = <draftId>:<attempt>` (one checkout per attempt). */
export const IDEMPOTENCY_SEPARATOR = ':';
export const APP_VERSION_MAX_LENGTH = 30;
/** Stored when the gateway confirms a different amount than we asked for. */
export const AMOUNT_MISMATCH_CODE = 'AMOUNT_MISMATCH';

/** Gateway notifications (SRV-084): the signature covers the raw body, so it is kept untouched. */
export const WEBHOOK_PREFIX = '/webhooks';
export const PAYMENT_WEBHOOK_ROUTE = '/payments';
export const PAYMENT_WEBHOOK_SIGNATURE_HEADER = 'x-signature';
/** Polling fallback: attempts still PENDING after this long are asked about again. */
export const RECONCILE_MIN_AGE_MS = 120_000;
export const RECONCILE_BATCH_SIZE = 50;
