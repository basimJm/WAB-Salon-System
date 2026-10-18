/** Merchant finance and subscription views (SRV-091, Merchant PRD M22, M23). */
export const MERCHANT_FINANCE_ROUTES = {
  base: '/finance',
  balance: '/balance',
  transactions: '/transactions',
  refunds: '/refunds',
  payouts: '/payouts',
} as const;
export const MERCHANT_SUBSCRIPTION_ROUTES = { base: '/subscription' } as const;
