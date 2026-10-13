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
