import { z } from 'zod';
import { CURRENCY_CODE } from '../../constants/money';
import { OTP_CHANNELS } from '../../constants/otp';
import { MAX_PAGE_SIZE } from '../../constants/pagination';
import { SETTING_DEFAULTS, SETTING_LIMITS } from '../../constants/settings';
import { isValidTimeZone } from '../../utils/time';

const positiveInt = z.number().int().min(1);
const nonNegativeInt = z.number().int().min(0);
const positiveNumber = z.number().positive();
/** Above 0 and up to 100 (a threshold of 0 % would always fire). */
const percent = z.number().gt(0).max(SETTING_LIMITS.percentMax);

interface Definition<S extends z.ZodType> {
  readonly schema: S;
  /** The default after passing through the schema, so it is read-only like any saved value. */
  readonly default: z.output<S>;
}

/** Fails at start-up (and in tests) if a default does not satisfy its own schema. */
const define = <S extends z.ZodType>(schema: S, defaultValue: z.input<S>): Definition<S> => ({
  schema,
  default: schema.parse(defaultValue),
});

/**
 * Every setting of BUSINESS_DOMAIN.md §10: its rule for a valid value and its default. Structural
 * checks only; the Admin PRD gives defaults but no business ranges.
 */
export const SETTING_DEFINITIONS = {
  timezone: define(
    z.string().refine(isValidTimeZone, { error: 'not a known time zone' }),
    SETTING_DEFAULTS.timezone,
  ),
  currency: define(z.literal(CURRENCY_CODE), SETTING_DEFAULTS.currency),
  'discovery.nearbyRadiusKm': define(positiveNumber, SETTING_DEFAULTS['discovery.nearbyRadiusKm']),
  'salon.maxBranches': define(positiveInt, SETTING_DEFAULTS['salon.maxBranches']),
  'booking.slotMinutes': define(positiveInt, SETTING_DEFAULTS['booking.slotMinutes']),
  'booking.maxDaysAhead': define(positiveInt, SETTING_DEFAULTS['booking.maxDaysAhead']),
  'booking.maxCompanions': define(nonNegativeInt, SETTING_DEFAULTS['booking.maxCompanions']),
  'booking.minLeadMinutes': define(nonNegativeInt, SETTING_DEFAULTS['booking.minLeadMinutes']),
  'booking.paymentHoldMinutes': define(positiveInt, SETTING_DEFAULTS['booking.paymentHoldMinutes']),
  'booking.autoCancelAfterStartMinutes': define(
    positiveInt,
    SETTING_DEFAULTS['booking.autoCancelAfterStartMinutes'],
  ),
  'booking.pendingAlertBeforeMinutes': define(
    positiveInt,
    SETTING_DEFAULTS['booking.pendingAlertBeforeMinutes'],
  ),
  'booking.closeReminderIntervalMinutes': define(
    positiveInt,
    SETTING_DEFAULTS['booking.closeReminderIntervalMinutes'],
  ),
  'booking.closeOverdueAlertHours': define(
    positiveInt,
    SETTING_DEFAULTS['booking.closeOverdueAlertHours'],
  ),
  // Each offset schedules one reminder job with a deterministic id, so offsets must be unique.
  'booking.reminderMinutes': define(
    z
      .array(positiveInt)
      .max(SETTING_LIMITS.listMaxLength)
      .refine((offsets) => new Set(offsets).size === offsets.length, {
        error: 'reminder offsets must be unique',
      })
      .readonly(),
    SETTING_DEFAULTS['booking.reminderMinutes'],
  ),
  'otp.length': define(
    z.number().int().min(SETTING_LIMITS.otpLengthMin).max(SETTING_LIMITS.otpLengthMax),
    SETTING_DEFAULTS['otp.length'],
  ),
  'otp.resendAfterSec': define(positiveInt, SETTING_DEFAULTS['otp.resendAfterSec']),
  'otp.maxRequests': define(positiveInt, SETTING_DEFAULTS['otp.maxRequests']),
  'otp.requestWindowSec': define(positiveInt, SETTING_DEFAULTS['otp.requestWindowSec']),
  'otp.maxWrong': define(positiveInt, SETTING_DEFAULTS['otp.maxWrong']),
  'otp.blockSec': define(positiveInt, SETTING_DEFAULTS['otp.blockSec']),
  'otp.codeTtlSec': define(positiveInt, SETTING_DEFAULTS['otp.codeTtlSec']),
  'otp.proofTtlSec': define(positiveInt, SETTING_DEFAULTS['otp.proofTtlSec']),
  'otp.channel': define(z.enum(OTP_CHANNELS), SETTING_DEFAULTS['otp.channel']),
  'auth.accessTokenTtlSec': define(positiveInt, SETTING_DEFAULTS['auth.accessTokenTtlSec']),
  'auth.refreshTokenTtlDays': define(positiveInt, SETTING_DEFAULTS['auth.refreshTokenTtlDays']),
  'admin.maxFailedLogins': define(positiveInt, SETTING_DEFAULTS['admin.maxFailedLogins']),
  'admin.lockSec': define(positiveInt, SETTING_DEFAULTS['admin.lockSec']),
  'admin.sessionIdleSec': define(positiveInt, SETTING_DEFAULTS['admin.sessionIdleSec']),
  'account.deletionGraceDays': define(positiveInt, SETTING_DEFAULTS['account.deletionGraceDays']),
  'subscription.trialDays': define(nonNegativeInt, SETTING_DEFAULTS['subscription.trialDays']),
  'subscription.warnDaysBefore': define(
    positiveInt,
    SETTING_DEFAULTS['subscription.warnDaysBefore'],
  ),
  'refund.maxRetries': define(nonNegativeInt, SETTING_DEFAULTS['refund.maxRetries']),
  'refund.delayAlertHours': define(positiveInt, SETTING_DEFAULTS['refund.delayAlertHours']),
  'reviews.maxPendingPerTargetPerCustomer': define(
    positiveInt,
    SETTING_DEFAULTS['reviews.maxPendingPerTargetPerCustomer'],
  ),
  'pagination.appPageSize': define(
    positiveInt.max(MAX_PAGE_SIZE),
    SETTING_DEFAULTS['pagination.appPageSize'],
  ),
  'pagination.adminPageSize': define(
    positiveInt.max(MAX_PAGE_SIZE),
    SETTING_DEFAULTS['pagination.adminPageSize'],
  ),
  'uploads.imageMaxMb': define(positiveInt, SETTING_DEFAULTS['uploads.imageMaxMb']),
  'uploads.videoMaxMb': define(positiveInt, SETTING_DEFAULTS['uploads.videoMaxMb']),
  'uploads.videoMaxSec': define(positiveInt, SETTING_DEFAULTS['uploads.videoMaxSec']),
  'uploads.docMaxMb': define(positiveInt, SETTING_DEFAULTS['uploads.docMaxMb']),
  'uploads.docMaxFiles': define(positiveInt, SETTING_DEFAULTS['uploads.docMaxFiles']),
  'alerts.paymentFailures': define(
    z
      .strictObject({
        count: positiveInt,
        windowMin: positiveInt,
        ratePct: percent,
        rateWindowMin: positiveInt,
      })
      .readonly(),
    SETTING_DEFAULTS['alerts.paymentFailures'],
  ),
  'alerts.api5xxRatePct': define(percent, SETTING_DEFAULTS['alerts.api5xxRatePct']),
  'alerts.crashesPerHour': define(positiveInt, SETTING_DEFAULTS['alerts.crashesPerHour']),
};

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
export type SettingValue<K extends SettingKey> = z.output<
  (typeof SETTING_DEFINITIONS)[K]['schema']
>;

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

export const isSettingKey = (value: unknown): value is SettingKey =>
  typeof value === 'string' && Object.hasOwn(SETTING_DEFINITIONS, value);
