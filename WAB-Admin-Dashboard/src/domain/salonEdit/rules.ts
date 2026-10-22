import { isJodString } from '@/domain/shared/money';
import { isLocalDate } from '@/domain/shared/time';
import type { PolicyInput, ScheduleDay, StaffInput } from './salonEdit';

const HH_MM = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
export const isHHmm = (value: string): boolean => HH_MM.test(value);
export const SERVICE_MIN_MINUTES = 5;
export const SERVICE_MAX_MINUTES = 1440;
export const CANCELLATION_MAX_HOURS = 720;
export const DEPOSIT_MIN_PERCENT = 1;
export const DEPOSIT_MAX_PERCENT = 100;
export const E164 = /^\+[1-9][0-9]{6,14}$/;
export const NAME_MIN = 1;
export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 1000;
export const LOCATION_TEXT_MAX = 300;
export const CLOSURE_REASON_MAX = 300;
export const BIO_MAX = 1000;
export const MAX_YEARS = 80;
export const MAX_EXTRA_DESCRIPTION = 500;
const LAT_LIMIT = 90;
const LNG_LIMIT = 180;

export const isLatitude = (v: number): boolean => Math.abs(v) <= LAT_LIMIT;
export const isLongitude = (v: number): boolean => Math.abs(v) <= LNG_LIMIT;

/** Minutes since midnight of an `HH:mm` text (callers check the format first). */
const minutes = (hhmm: string): number => {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/** Open days need a valid opening time before the closing time. */
export function scheduleProblems(days: readonly ScheduleDay[]): readonly string[] {
  return days
    .filter(
      (d) => !d.isOff && !(isHHmm(d.open) && isHHmm(d.close) && minutes(d.open) < minutes(d.close)),
    )
    .map((d) => d.day);
}

/** `from` and `to` are local days and `to` is not before `from`. */
export const isClosureRange = (from: string, to: string): boolean =>
  isLocalDate(from) && isLocalDate(to) && from <= to;

export const isServicePrice = (price: string): boolean => isJodString(price) && Number(price) > 0;
export const isServiceDuration = (n: number): boolean =>
  Number.isInteger(n) && n >= SERVICE_MIN_MINUTES && n <= SERVICE_MAX_MINUTES;

/** Staff days with only one end set, or an end before the start. */
export function staffDayProblems(days: StaffInput['workingDays']): readonly string[] {
  return days
    .filter((d) => {
      const none = d.start === undefined && d.end === undefined;
      if (none) return false;
      return !(
        d.start !== undefined &&
        d.end !== undefined &&
        isHHmm(d.start) &&
        isHHmm(d.end) &&
        minutes(d.start) < minutes(d.end)
      );
    })
    .map((d) => d.day);
}

export type PolicyProblem = 'options' | 'deposit' | 'window' | 'notes';
const NOTES_MAX = 1000;

export function policyProblems(p: PolicyInput): readonly PolicyProblem[] {
  const found: PolicyProblem[] = [];
  if (p.paymentOptions.length === 0 || new Set(p.paymentOptions).size !== p.paymentOptions.length)
    found.push('options');
  const needsDeposit = p.paymentOptions.includes('DEPOSIT');
  const pct = p.depositPercentage;
  if (
    needsDeposit &&
    (pct === undefined ||
      !Number.isInteger(pct) ||
      pct < DEPOSIT_MIN_PERCENT ||
      pct > DEPOSIT_MAX_PERCENT)
  )
    found.push('deposit');
  if (
    !Number.isInteger(p.cancellationWindowHours) ||
    p.cancellationWindowHours < 0 ||
    p.cancellationWindowHours > CANCELLATION_MAX_HOURS
  )
    found.push('window');
  if ((p.notes ?? '').length > NOTES_MAX) found.push('notes');
  return found;
}
