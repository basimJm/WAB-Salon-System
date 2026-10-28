import type { Language } from '@/constants/i18n';
import { ROUTES } from '@/constants/routes';
import type { Page, PageQuery } from '@/domain/shared/page';

export const ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED'] as const;
/** Platform alerts the server raises (BUSINESS_DOMAIN §8). A new kind = one entry here + `alerts.kinds.<KIND>` labels. */
export const ALERT_KINDS = ['ERROR_RATE_SPIKE', 'JOB_FAILED', 'ITEM_FLAGGED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface Alert {
  readonly id: string;
  readonly kind: AlertKind;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  /** In the request language; English only on servers that send no `titles`. */
  readonly title: string;
  /** Both languages; absent on older servers. */
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

/** Subjects are UPPER_SNAKE on the wire (`ITEM`); a camelCase spelling from an older raise site means the same. */
export const normalizeEntityType = (type: string): string =>
  type.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

/** Where an alert's subject lives in the panel; unknown subjects have no link. */
export function alertLink(alert: Pick<Alert, 'entityType' | 'entityId'>): string | null {
  const { entityType: type, entityId: id } = alert;
  if (!type || !id) return null;
  const routes: Readonly<Record<string, string>> = {
    ITEM: `${ROUTES.items}/${id}`,
  };
  return routes[normalizeEntityType(type)] ?? null;
}
