import {
  ALERT_ENTITY_TYPES,
  alertTitleKey,
  type AlertEntityType,
  type AlertKind,
} from '../../constants/alerts';
import { DEFAULT_LANGUAGE, type Language } from '../../constants/i18n';
import type { AlertRaw, AlertTitle } from '../../models/alert.model';
import type { Entity } from '../../utils/database/plain';
import { translate } from '../../utils/i18n';

/** The title of an alert kind in both languages, from the locale files (SRV-150). */
export const titlesOf = (kind: AlertKind): AlertTitle => ({
  ar: translate('ar', alertTitleKey(kind)),
  en: translate('en', alertTitleKey(kind)),
});

const isTitle = (value: unknown): value is AlertTitle =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<AlertTitle>).ar === 'string' &&
  typeof (value as Partial<AlertTitle>).en === 'string';

/**
 * The stored `{ ar, en }` title; an alert stored before SRV-150 holds an English string,
 * so its titles come from the locale files of its kind (no data migration needed).
 */
export const alertTitles = (alert: { kind: AlertKind; title: unknown }): AlertTitle =>
  isTitle(alert.title) ? alert.title : titlesOf(alert.kind);

export const alertTitle = (
  alert: { kind: AlertKind; title: unknown },
  language: Language,
): string => alertTitles(alert)[language];

/**
 * The uppercase subject type; alerts stored before SRV-150 by the salon deletion path hold
 * `salon` (server issue S12). Unknown values read as `null`.
 */
export const normalizeAlertEntityType = (value: unknown): AlertEntityType | null => {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  return (ALERT_ENTITY_TYPES as readonly string[]).includes(upper)
    ? (upper as AlertEntityType)
    : null;
};

export interface AlertFeedPayload {
  readonly id: string;
  readonly kind: AlertKind;
  readonly severity: AlertRaw['severity'];
  /** A socket event has no request language: the default (Arabic); `titles` carries both. */
  readonly title: string;
  readonly titles: AlertTitle;
}

/** The `alert.created` event for the admin room. */
export const alertFeedPayload = (alert: Entity<AlertRaw>): AlertFeedPayload => {
  const titles = alertTitles(alert);
  return {
    id: alert.id,
    kind: alert.kind,
    severity: alert.severity,
    title: titles[DEFAULT_LANGUAGE],
    titles,
  };
};
