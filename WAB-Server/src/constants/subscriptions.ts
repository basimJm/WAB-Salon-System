/** Subscriptions (SRV-042, BUSINESS_DOMAIN.md §3.5 `subscriptions`, §5.13). */
export const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Manual subscriptions (SRV-089, Admin PRD A19): paid outside the app and recorded by the admin. */
export const ADMIN_SUBSCRIPTION_ROUTES = {
  base: '/subscriptions',
  bySalon: '/:salonId',
  payments: '/:salonId/payments',
} as const;
export const SUBSCRIPTION_AUDIT = {
  entityType: 'SUBSCRIPTION',
  payment: 'SUBSCRIPTION_PAYMENT_RECORD',
} as const;
export const SUBSCRIPTION_METHOD_MAX_LENGTH = 40;
export const SUBSCRIPTION_REFERENCE_MAX_LENGTH = 100;
export const SUBSCRIPTION_NOTE_MAX_LENGTH = 300;
export const SUBSCRIPTION_BATCH_SIZE = 200;
