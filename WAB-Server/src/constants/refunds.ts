/** Refunds (SRV-086, BUSINESS_DOMAIN.md §3.5 `refunds`, §5.10). */
export const REFUNDS_COLLECTION = 'refunds';
/** First retry waits this long, then it doubles (5 min, 10, 20...). */
export const REFUND_RETRY_BASE_DELAY_MS = 300_000;
export const REFUND_BATCH_SIZE = 50;
export const REFUND_ERROR_MAX_LENGTH = 300;
export const MANUAL_REFERENCE_MAX_LENGTH = 100;
export const ADMIN_REFUND_ROUTES = {
  base: '/refunds',
  byId: '/:id',
  retry: '/:id/retry',
  manual: '/:id/manual',
} as const;
export const REFUND_AUDIT = {
  entityType: 'REFUND',
  retry: 'REFUND_RETRY',
  manual: 'REFUND_MARK_MANUAL',
} as const;
