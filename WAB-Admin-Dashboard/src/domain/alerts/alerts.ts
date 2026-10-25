import type { Language } from '@/constants/i18n';
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
  'SALON_DELETION_REQUEST',
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Alert {
  readonly id: string;
  readonly kind: AlertKind;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  /** In the request language (contract 1.4.0+); English only on older servers. */
  readonly title: string;
  /** Both languages (SRV-150, contract 1.4.0); absent on older servers. */
  readonly titles?: { readonly ar: string; readonly en: string };
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly data: Record<string, unknown>;
  readonly status: AlertStatus;
  readonly emailedAt: string | null;
  readonly acknowledgedAt: string | null;
  readonly createdAt: string;
}

/** The alert title in the panel language: `titles[language]` when the server sends both, else `title`. */
export const alertTitle = (alert: Pick<Alert, 'title' | 'titles'>, language: Language): string =>
  alert.titles?.[language] || alert.title;

export interface AlertsRepository {
  list(query: PageQuery & { status?: AlertStatus; kind?: AlertKind }): Promise<Page<Alert>>;
  /** Number of alerts still NEW: the bell badge. */
  count(): Promise<number>;
  /** Repeating it is harmless. */
  acknowledge(id: string): Promise<Alert>;
}

/**
 * The server names alert subjects in UPPER_SNAKE (`SALON`, `REFUND`, `CATALOG_REQUEST`) but a few raise sites use
 * camelCase (`salon`); both spellings mean the same subject.
 */
export const normalizeEntityType = (type: string): string =>
  type.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

/** Where an alert's subject lives in the panel; unknown subjects have no link. */
export function alertLink(
  alert: Pick<Alert, 'entityType' | 'entityId'> & { readonly kind?: AlertKind },
): string | null {
  const { entityType: type, entityId: id } = alert;
  if (!type || !id) return null;
  // A new application is a SALON subject, but it is reviewed on the application page.
  if (alert.kind === 'SALON_APPLICATION') return `/salons/applications/${id}`;
  const routes: Readonly<Record<string, string>> = {
    SALON: `/salons/${id}`,
    BOOKING: `/bookings/${id}`,
    CUSTOMER: `/customers/${id}`,
    TRANSACTION: `/finance/transactions/${id}`,
    REFUND: '/finance/refunds',
    SUBSCRIPTION: '/finance/subscriptions',
    REVIEW: '/reviews',
    APPLICATION: `/salons/applications/${id}`,
    CATALOG_REQUEST: '/catalog/requests',
  };
  return routes[normalizeEntityType(type)] ?? null;
}
