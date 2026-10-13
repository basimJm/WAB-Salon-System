import type { DayOfWeek } from './time';

/** Salon schema and application flow (SRV-041, BUSINESS_DOMAIN.md §3.3, Merchant PRD M05-M08). */
export const SALONS_COLLECTION = 'salons';
export const SALON_STATES = [
  'APPLICATION_PENDING',
  'APPLICATION_REJECTED',
  'APPROVED_INCOMPLETE',
  'LIVE',
  'OFFLINE',
] as const;
export type SalonState = (typeof SALON_STATES)[number];

export const PAYMENT_OPTIONS = ['PAY_ON_ARRIVAL', 'DEPOSIT', 'FULL_ONLINE'] as const;
export const FULL_PAYMENT_REFUND_RULES = ['FULL', 'MINUS_DEPOSIT'] as const;
export const NO_SHOW_DEPOSIT_RULES = ['KEEP', 'REFUND'] as const;
export const NO_SHOW_FULL_PAYMENT_RULES = ['KEEP', 'REFUND_MINUS_DEPOSIT', 'REFUND_FULL'] as const;

export const SALON_NAME_MIN_LENGTH = 1;
export const SALON_NAME_MAX_LENGTH = 80;
export const SALON_DESCRIPTION_MAX_LENGTH = 1_000;
export const SALON_NOTES_MAX_LENGTH = 1_000;
export const SALON_REJECTION_REASON_MAX_LENGTH = 1_000;
export const DEPOSIT_PERCENT_MIN = 1;
export const DEPOSIT_PERCENT_MAX = 100;
export const LICENSE_DOCUMENTS_MIN = 1;
export const LICENSE_DOCUMENTS_MAX = 5;
export const STORAGE_KEY_MAX_LENGTH = 1_024;
/** Server-generated storage keys: path segments of safe characters. */
export const STORAGE_KEY_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9._-]+)*$/;

/** A new salon starts with every day off; the owner sets real hours while completing the profile. */
export const SCHEDULE_DAY_ORDER: readonly DayOfWeek[] = [
  'SAT',
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
];
export const DEFAULT_OPEN = '09:00';
export const DEFAULT_CLOSE = '18:00';

export const MERCHANT_SALON_ROUTES = {
  base: '/salon',
  apply: '/applications',
  application: '/application',
  resubmit: '/application/resubmit',
} as const;
