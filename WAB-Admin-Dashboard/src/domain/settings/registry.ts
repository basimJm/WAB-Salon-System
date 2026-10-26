export type SettingGroup =
  | 'discovery'
  | 'booking'
  | 'otp'
  | 'adminAuth'
  | 'tokens'
  | 'accounts'
  | 'subscription'
  | 'branches'
  | 'refunds'
  | 'reviews'
  | 'pagination'
  | 'uploads'
  | 'alerts';
export type SettingKind = 'int' | 'intList';
export type SettingUnit =
  'km' | 'minutes' | 'seconds' | 'days' | 'hours' | 'digits' | 'percent' | 'mb';

export interface SettingDefinition {
  readonly key: string;
  /** Set when the stored value is an object and this row edits one of its integer members. */
  readonly field?: string;
  readonly group: SettingGroup;
  readonly kind: SettingKind;
  readonly unit?: SettingUnit;
  /** Sanity bounds (the server validates structure only: BUSINESS_DOMAIN §10). */
  readonly min: number;
  readonly max: number;
}

type Bounds = readonly [number, number];
const row = (
  key: string,
  group: SettingGroup,
  [min, max]: Bounds,
  unit?: SettingUnit,
): SettingDefinition => ({ key, group, kind: 'int', min, max, ...(unit ? { unit } : {}) });
const member = (
  key: string,
  field: string,
  bounds: Bounds,
  unit?: SettingUnit,
): SettingDefinition => ({
  ...row(key, 'alerts', bounds, unit),
  field,
});

const PERCENT: Bounds = [0, 100];
const PAYMENT_ALERTS = 'alerts.paymentFailures';

/** Every editable key of BUSINESS_DOMAIN §10 (timezone and currency are shown read-only). */
export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  row('discovery.nearbyRadiusKm', 'discovery', [1, 200], 'km'),
  row('booking.slotMinutes', 'booking', [5, 120], 'minutes'),
  row('booking.maxDaysAhead', 'booking', [1, 365], 'days'),
  row('booking.maxCompanions', 'booking', [0, 20]),
  row('booking.minLeadMinutes', 'booking', [0, 1440], 'minutes'),
  row('booking.paymentHoldMinutes', 'booking', [1, 60], 'minutes'),
  row('booking.autoCancelAfterStartMinutes', 'booking', [1, 1440], 'minutes'),
  row('booking.pendingAlertBeforeMinutes', 'booking', [1, 1440], 'minutes'),
  {
    key: 'booking.reminderMinutes',
    group: 'booking',
    kind: 'intList',
    unit: 'minutes',
    min: 1,
    max: 10080,
  },
  row('otp.length', 'otp', [4, 10], 'digits'),
  row('otp.resendAfterSec', 'otp', [10, 3600], 'seconds'),
  row('otp.maxRequests', 'otp', [1, 100]),
  row('otp.requestWindowSec', 'otp', [30, 86400], 'seconds'),
  row('otp.maxWrong', 'otp', [1, 100]),
  row('otp.blockSec', 'otp', [30, 86400], 'seconds'),
  row('admin.maxFailedLogins', 'adminAuth', [1, 20]),
  row('admin.lockSec', 'adminAuth', [30, 86400], 'seconds'),
  // Up to 30 days: the owner default is 2 days (172800 s, 2026-10-26).
  row('admin.sessionIdleSec', 'adminAuth', [60, 2_592_000], 'seconds'),
  row('auth.accessTokenTtlSec', 'tokens', [60, 86400], 'seconds'),
  row('auth.refreshTokenTtlDays', 'tokens', [1, 365], 'days'),
  row('account.deletionGraceDays', 'accounts', [0, 365], 'days'),
  row('salon.maxBranches', 'branches', [1, 200]),
  row('subscription.trialDays', 'subscription', [0, 365], 'days'),
  row('subscription.warnDaysBefore', 'subscription', [0, 90], 'days'),
  row('refund.maxRetries', 'refunds', [0, 20]),
  row('refund.delayAlertHours', 'refunds', [1, 720], 'hours'),
  row('reviews.maxPendingPerTargetPerCustomer', 'reviews', [1, 10]),
  row('pagination.appPageSize', 'pagination', [5, 100]),
  row('pagination.adminPageSize', 'pagination', [5, 100]),
  row('uploads.imageMaxMb', 'uploads', [1, 100], 'mb'),
  row('uploads.videoMaxMb', 'uploads', [1, 500], 'mb'),
  row('uploads.videoMaxSec', 'uploads', [1, 600], 'seconds'),
  row('uploads.docMaxMb', 'uploads', [1, 100], 'mb'),
  row('uploads.docMaxFiles', 'uploads', [1, 20]),
  member(PAYMENT_ALERTS, 'count', [1, 1000]),
  member(PAYMENT_ALERTS, 'windowMin', [1, 1440], 'minutes'),
  member(PAYMENT_ALERTS, 'ratePct', PERCENT, 'percent'),
  member(PAYMENT_ALERTS, 'rateWindowMin', [1, 1440], 'minutes'),
  row('alerts.api5xxRatePct', 'alerts', PERCENT, 'percent'),
  row('alerts.crashesPerHour', 'alerts', [1, 10000]),
];

/** Read-only platform facts shown next to the editable ones. */
export const READ_ONLY_SETTING_KEYS = ['timezone', 'currency'] as const;

/** Stable id of a row: the key, plus the member name for object settings. */
export const rowIdOf = (def: SettingDefinition): string =>
  def.field ? `${def.key}.${def.field}` : def.key;

/** i18n keys cannot contain dots: `booking.slotMinutes` -> `booking_slotMinutes`. */
export const settingId = (idOrKey: string): string => idOrKey.replace(/\./g, '_');

export const definitionsOf = (group: SettingGroup): readonly SettingDefinition[] =>
  SETTING_DEFINITIONS.filter((d) => d.group === group);
