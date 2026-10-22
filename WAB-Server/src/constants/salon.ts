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

/** Admin review of salon applications (SRV-042, Admin PRD A14). */
export const ADMIN_APPLICATION_ROUTES = {
  base: '/salons/applications',
  byId: '/:id',
  approve: '/:id/approve',
  reject: '/:id/reject',
} as const;
/** Lifetime of the signed URLs an admin gets to read the private license documents. */
export const LICENSE_URL_TTL_SEC = 300;

/** Things a salon profile can still lack before customers may see it (BUSINESS_DOMAIN.md §5.2). */
export const COMPLETENESS_ITEMS = [
  'COVER',
  'PROFILE_IMAGE',
  'NAME',
  'DESCRIPTION',
  'LOCATION',
  'PHONE',
  'WORKING_HOURS',
  'SERVICE',
  'STAFF',
  'POLICY',
] as const;
export type CompletenessItem = (typeof COMPLETENESS_ITEMS)[number];

/** Salon events the owner is told about. */
export const SALON_STATE_EVENTS = [
  'salon.live',
  'salon.not_bookable',
  'salon.offline',
  'salon.online',
  'salon.gender_changed',
  'salon.edited_by_admin',
  'salon.deletion_rejected',
] as const;
export type SalonStateEvent = (typeof SALON_STATE_EVENTS)[number];

/** What an admin can change on behalf of a salon (SRV-119/120); also names the owner notice text. */
export const SALON_EDIT_AREAS = [
  'profile',
  'gallery',
  'hours',
  'services',
  'staff',
  'policy',
] as const;
export type SalonEditArea = (typeof SALON_EDIT_AREAS)[number];
export const ADMIN_SALON_STATE_ROUTES = {
  base: '/salons',
  list: '/',
  byId: '/:id',
  gender: '/:id/gender',
  members: '/:id/members',
  offline: '/:id/offline',
  online: '/:id/online',
} as const;

/** Salon profile editing (SRV-045, Merchant PRD M12-M13). */
export const MERCHANT_PROFILE_ROUTES = { root: '/', profile: '/profile' } as const;
export const LATITUDE_LIMIT = 90;
export const LONGITUDE_LIMIT = 180;
export const LOCATION_TEXT_MAX_LENGTH = 300;

/** Salon policy (SRV-054, Merchant PRD M19). */
export const MERCHANT_POLICY_ROUTES = { base: '/salon/policy' } as const;
/** Assumption (the domain only says >= 0): a cancellation window is at most 30 days. */
export const CANCELLATION_WINDOW_MAX_HOURS = 720;
