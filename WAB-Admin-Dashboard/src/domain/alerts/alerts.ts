import type { Page, PageQuery } from '@/domain/shared/page';

export const ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED'] as const;
export const ALERT_KINDS = [
  'PAYMENT_FAILURE_SPIKE',
  'REFUND_FAILED',
  'REFUND_DELAYED',
  'SUBSCRIPTION_ENDING',
  'SUBSCRIPTION_EXPIRED',
  'SALON_APPLICATION',
  'REVIEW_PENDING',
  'CATALOG_REQUEST',
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Alert {
  readonly id: string;
  readonly kind: AlertKind;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly title: string;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly data: Record<string, unknown>;
  readonly status: AlertStatus;
  readonly emailedAt: string | null;
  readonly acknowledgedAt: string | null;
  readonly createdAt: string;
}

export interface AlertsRepository {
  list(query: PageQuery & { status?: AlertStatus; kind?: AlertKind }): Promise<Page<Alert>>;
  /** Number of alerts still NEW: the bell badge. */
  count(): Promise<number>;
  /** Repeating it is harmless. */
  acknowledge(id: string): Promise<Alert>;
}

/** Where an alert's subject lives in the panel; unknown subjects have no link. */
export function alertLink(alert: Pick<Alert, 'entityType' | 'entityId'>): string | null {
  const { entityType: type, entityId: id } = alert;
  if (!type || !id) return null;
  const routes: Readonly<Record<string, string>> = {
    salon: `/salons/${id}`,
    booking: `/bookings/${id}`,
    customer: `/customers/${id}`,
    transaction: `/finance/transactions/${id}`,
    refund: '/finance/refunds',
    subscription: '/finance/subscriptions',
    review: '/reviews',
    application: `/salons/applications/${id}`,
    catalogRequest: '/catalog/requests',
  };
  return routes[type] ?? null;
}
