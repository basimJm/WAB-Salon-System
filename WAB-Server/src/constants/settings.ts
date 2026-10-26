import { ADMIN_PAGE_SIZE, APP_PAGE_SIZE } from './pagination';
import { CURRENCY_CODE, FULL_PERCENT } from './money';
import { DEFAULT_TIMEZONE } from './time';

/**
 * Settings (SRV-017): the keys an admin can change and their defaults, exactly as in
 * BUSINESS_DOMAIN.md §10. A key with no stored value uses its default.
 */
export const SETTING_DEFAULTS = {
  timezone: DEFAULT_TIMEZONE,
  currency: CURRENCY_CODE,
  'discovery.nearbyRadiusKm': 10,
  'salon.maxBranches': 20,
  'booking.slotMinutes': 15,
  'booking.maxDaysAhead': 90,
  'booking.maxCompanions': 5,
  'booking.minLeadMinutes': 0,
  'booking.paymentHoldMinutes': 10,
  'booking.autoCancelAfterStartMinutes': 60,
  'booking.pendingAlertBeforeMinutes': 30,
  'booking.reminderMinutes': [60, 15],
  'otp.length': 6,
  'otp.resendAfterSec': 60,
  'otp.maxRequests': 5,
  'otp.requestWindowSec': 300,
  'otp.maxWrong': 5,
  'otp.blockSec': 900,
  'otp.codeTtlSec': 300,
  'otp.proofTtlSec': 600,
  'otp.channel': 'WHATSAPP',
  'auth.accessTokenTtlSec': 900,
  'auth.refreshTokenTtlDays': 90,
  'admin.maxFailedLogins': 5,
  'admin.lockSec': 900,
  'admin.sessionIdleSec': 1_800,
  'account.deletionGraceDays': 30,
  'subscription.trialDays': 90,
  'subscription.warnDaysBefore': 7,
  'refund.maxRetries': 5,
  'refund.delayAlertHours': 48,
  'reviews.maxPendingPerTargetPerCustomer': 1,
  'pagination.appPageSize': APP_PAGE_SIZE,
  'pagination.adminPageSize': ADMIN_PAGE_SIZE,
  'uploads.imageMaxMb': 10,
  'uploads.videoMaxMb': 50,
  'uploads.videoMaxSec': 60,
  'uploads.docMaxMb': 10,
  'uploads.docMaxFiles': 5,
  'alerts.paymentFailures': { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 },
  'alerts.api5xxRatePct': 2,
  'alerts.crashesPerHour': 10,
} as const;

/**
 * Structural limits applied when a value is saved. They keep a typo from breaking the system; the
 * business ranges (if any) are product decisions the Admin PRD does not give.
 */
export const SETTING_LIMITS = {
  /** Highest percentage value. */
  percentMax: FULL_PERCENT,
  /** The WhatsApp code is 6 digits by default; the app shows `otp.length` boxes. */
  otpLengthMin: 4,
  otpLengthMax: 10,
  /** Longest list of reminder offsets. */
  listMaxLength: 10,
} as const;

export const SETTINGS_COLLECTION = 'settings';

/** Redis cache of the stored settings (shared by every API instance). */
export const SETTINGS_CACHE_KEY_PARTS = {
  /** JSON list of the stored `{ key, value }` pairs. */
  overrides: 'overrides',
  /** Counter bumped on every change; guards the cache against stale writes. */
  version: 'version',
} as const;
/** Only a safety net: a change deletes the cache at once. */
export const SETTINGS_CACHE_TTL_SEC = 60;
/** The version of a cache that was never written. */
export const SETTINGS_INITIAL_VERSION = '0';
/**
 * After a Redis failure the cache is skipped for this long, so a Redis outage costs one slow call
 * per window instead of one per request.
 */
export const SETTINGS_REDIS_RETRY_MS = 5_000;
