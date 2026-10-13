import type { ScheduleDay } from '../../models/salon.model';
import { dayOfWeek, localDateOf, localMinutesOf, parseHHmm } from '../../utils/time';

export interface ClosureRange {
  readonly from: string;
  readonly to: string;
  readonly reason: string;
}

export interface TodaysHours {
  /** The salon's local date the answer is for. */
  readonly date: string;
  readonly isClosed: boolean;
  /** Why it is closed today: an exceptional closure's reason, or `null` for a normal day off. */
  readonly closedReason: string | null;
  /** Opening hours of today (`HH:mm`); `null` when closed. */
  readonly open: string | null;
  readonly close: string | null;
  /** Open right now: today is a working day and the local time is in [open, close). */
  readonly isOpenNow: boolean;
}

/** The closure that covers a local date (both ends inclusive), if any. */
export const closureOn = (
  date: string,
  closures: readonly ClosureRange[],
): ClosureRange | undefined =>
  closures.find((closure) => closure.from <= date && date <= closure.to);

/**
 * Open/closed for a local date (BUSINESS_DOMAIN.md §5.3): closed if a closure covers it or the
 * weekday is off; otherwise open between `open` and `close`. `isOpenNow` only makes sense for
 * the date of `now` (the local date), so this takes the instant and finds that date itself.
 */
export const todaysHours = (
  schedule: readonly Pick<ScheduleDay, 'day' | 'isOff' | 'open' | 'close'>[],
  closures: readonly ClosureRange[],
  now: Date,
  timeZone: string,
): TodaysHours => {
  const date = localDateOf(now, timeZone);
  const closure = closureOn(date, closures);
  const day = schedule.find((entry) => entry.day === dayOfWeek(date));
  if (closure !== undefined || day === undefined || day.isOff) {
    return {
      date,
      isClosed: true,
      closedReason: closure?.reason ?? null,
      open: null,
      close: null,
      isOpenNow: false,
    };
  }
  const minutes = localMinutesOf(now, timeZone);
  return {
    date,
    isClosed: false,
    closedReason: null,
    open: day.open,
    close: day.close,
    isOpenNow: minutes >= parseHHmm(day.open) && minutes < parseHHmm(day.close),
  };
};
