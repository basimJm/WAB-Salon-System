/** Manual payouts to salons (SRV-088, BUSINESS_DOMAIN.md §3.5 `payouts`, §5.14). */
export const PAYOUTS_COLLECTION = 'payouts';
export const PAYOUT_REFERENCE_MAX_LENGTH = 100;
export const PAYOUT_NOTE_MAX_LENGTH = 300;
export const ADMIN_PAYOUT_ROUTES = {
  base: '/payouts',
  balances: '/balances',
  preview: '/preview',
  byId: '/:id',
  transfer: '/:id/transfer',
} as const;
export const PAYOUT_AUDIT = {
  entityType: 'PAYOUT',
  create: 'PAYOUT_CREATE',
  transfer: 'PAYOUT_TRANSFER',
} as const;
export const PAYOUT_LEDGER_NOTE = 'payout';
