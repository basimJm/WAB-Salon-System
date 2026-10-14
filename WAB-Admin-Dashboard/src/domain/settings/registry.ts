export type SettingGroup = 'discovery' | 'booking' | 'otp';
export type SettingKind = 'int' | 'intList';

export interface SettingDefinition {
  readonly key: string;
  readonly group: SettingGroup;
  readonly kind: SettingKind;
  /** Unit label key (`settings.unit.<unit>`), absent for plain counts. */
  readonly unit?: 'km' | 'minutes' | 'seconds' | 'days' | 'digits';
  /** Sanity bounds (the server validates structure only: BUSINESS_DOMAIN §10). */
  readonly min: number;
  readonly max: number;
}

const int = (
  key: string,
  group: SettingGroup,
  [min, max]: readonly [number, number],
  unit?: SettingDefinition['unit'],
): SettingDefinition => ({ key, group, kind: 'int', min, max, ...(unit ? { unit } : {}) });

/** Keys of BUSINESS_DOMAIN §10 edited by the core settings sections (ADM-031). */
export const CORE_SETTINGS: readonly SettingDefinition[] = [
  int('discovery.nearbyRadiusKm', 'discovery', [1, 200], 'km'),
  int('booking.slotMinutes', 'booking', [5, 120], 'minutes'),
  int('booking.maxDaysAhead', 'booking', [1, 365], 'days'),
  int('booking.maxCompanions', 'booking', [0, 20]),
  int('booking.minLeadMinutes', 'booking', [0, 1440], 'minutes'),
  int('booking.paymentHoldMinutes', 'booking', [1, 60], 'minutes'),
  int('booking.autoCancelAfterStartMinutes', 'booking', [1, 1440], 'minutes'),
  int('booking.pendingAlertBeforeMinutes', 'booking', [1, 1440], 'minutes'),
  {
    key: 'booking.reminderMinutes',
    group: 'booking',
    kind: 'intList',
    unit: 'minutes',
    min: 1,
    max: 10080,
  },
  int('otp.length', 'otp', [4, 10], 'digits'),
  int('otp.resendAfterSec', 'otp', [10, 3600], 'seconds'),
  int('otp.maxRequests', 'otp', [1, 100]),
  int('otp.requestWindowSec', 'otp', [30, 86400], 'seconds'),
  int('otp.maxWrong', 'otp', [1, 100]),
  int('otp.blockSec', 'otp', [30, 86400], 'seconds'),
];

export const definitionsOf = (group: SettingGroup): readonly SettingDefinition[] =>
  CORE_SETTINGS.filter((d) => d.group === group);

/** i18n keys cannot contain dots: `booking.slotMinutes` -> `booking_slotMinutes`. */
export const settingId = (key: string): string => key.replace(/\./g, '_');
