/** Admin alerts (SRV-106, BUSINESS_DOMAIN.md §3.7 `alerts`, §9 `alerts:evaluate`, Admin PRD A27). */
export const ALERTS_COLLECTION = 'alerts';
export const ALERT_KINDS = [
  'PAYMENT_FAILURE_SPIKE',
  'REFUND_FAILED',
  'REFUND_DELAYED',
  'SUBSCRIPTION_ENDING',
  'SUBSCRIPTION_EXPIRED',
  'SALON_APPLICATION',
  'REVIEW_PENDING',
  'CATALOG_REQUEST',
  'SALON_DELETION_REQUEST',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
export const ALERT_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export const ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export const ALERT_TITLE_MAX_LENGTH = 200;
/** What an alert points at: one uppercase spelling on every path (SRV-150, server issue S12). */
export const ALERT_ENTITY_TYPES = ['SALON', 'REFUND', 'REVIEW', 'CATALOG_REQUEST'] as const;
export type AlertEntityType = (typeof ALERT_ENTITY_TYPES)[number];
/** Locale key of an alert kind's title (`ar.json` / `en.json`). */
export const alertTitleKey = (kind: AlertKind): string => `alerts.${kind}.title`;
/** Only entities created this recently are announced as "new" (older ones were seen or are no news). */
export const ALERT_NEW_ENTITY_LOOKBACK_MIN = 30;
/** Most entities announced per kind in one run. */
export const ALERT_BATCH_LIMIT = 50;
export const ALERT_SOCKET_EVENT = 'alert.created';

/** Alert inbox and email delivery (SRV-107, Admin PRD A27). */
export const ADMIN_ALERT_ROUTES = {
  base: '/alerts',
  byId: '/:id',
  acknowledge: '/:id/acknowledge',
  count: '/count',
} as const;
/** Quiet alerts (INFO) are mailed together once the oldest has waited this long; WARNING/CRITICAL go at once. */
export const ALERT_DIGEST_AFTER_MIN = 60;
/** Most alerts mailed in one run (each CRITICAL/WARNING alert is its own email). */
export const ALERT_EMAIL_BATCH_LIMIT = 20;
/** Alerts listed in one digest email; the rest wait for the next one. */
export const ALERT_DIGEST_MAX_ITEMS = 50;
/** Hex characters of the digest's idempotency key (derived from the alert ids). */
export const ALERT_DIGEST_KEY_LENGTH = 32;
