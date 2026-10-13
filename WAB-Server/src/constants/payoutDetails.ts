/** Salon bank details for payouts (SRV-090, BUSINESS_DOMAIN.md §3.3 `payoutDetails`, Merchant PRD M22). */
export const MERCHANT_PAYOUT_DETAILS_ROUTES = { base: '/salon/payout-details' } as const;
export const ADMIN_PAYOUT_DETAILS_ROUTES = {
  base: '/salons',
  byId: '/:id/payout-details',
} as const;
export const BANK_NAME_MAX_LENGTH = 80;
export const ACCOUNT_HOLDER_MAX_LENGTH = 80;
export const PAYOUT_DETAILS_AUDIT = {
  entityType: 'PAYOUT_DETAILS',
  view: 'PAYOUT_DETAILS_VIEW',
  update: 'PAYOUT_DETAILS_UPDATE',
  /** Reason stored when an admin opens the full IBAN to make a transfer. */
  viewReason: 'Viewed to transfer a payout',
} as const;
/** Changing details sends an OTP to the owner; generous but bounded per IP (the phone is limited by the OTP gate). */
export const PAYOUT_DETAILS_RATE_LIMIT = { windowMs: 60_000, max: 20 } as const;
