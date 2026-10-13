/** Subscriptions (SRV-042, BUSINESS_DOMAIN.md §3.5 `subscriptions`, §5.13). */
export const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
