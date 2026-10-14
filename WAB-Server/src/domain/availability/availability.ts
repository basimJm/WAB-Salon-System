import type { DayOfWeek } from '../../constants/time';
import { MS_PER_DAY, MS_PER_MINUTE } from '../../constants/time';
import type { ScheduleDay } from '../../models/salon.model';
import {
  addDays,
  dayOfWeek,
  diffDays,
  localDateOf,
  localDayRange,
  parseHHmm,
  rangesOverlap,
  zonedTimeToUtc,
} from '../../utils/time';
import { closureOn, type ClosureRange } from '../salons/hours';

/** A team member who may be booked, reduced to what availability needs. */
export interface AvailabilityStaff {
  readonly id: string;
  readonly active: boolean;
  readonly providesServices: boolean;
  readonly serviceIds: readonly string[];
  readonly brideQualified: boolean;
  /** A day without `start`/`end` follows the salon's hours. */
  readonly workingDays: readonly {
    day: DayOfWeek;
    start?: string | undefined;
    end?: string | undefined;
  }[];
}

/** Civil dates, both ends inclusive. */
export interface LeaveRange {
  readonly staffId: string;
  readonly from: string;
  readonly to: string;
}

/** A time a staff member cannot take: a PENDING/APPROVED booking, a payment hold or a draft pick. */
export interface BusyInterval {
  readonly staffId: string;
  readonly start: Date;
  readonly end: Date;
}

export interface AvailabilityPerson {
  /** Catalog service ids the person wants; staff must be able to do ALL of them. */
  readonly serviceIds: readonly string[];
  readonly durationMinutes: number;
  readonly isBride: boolean;
  /** Some selected service is bride-only (VIP): only brides may book it. */
  readonly hasBrideOnlyService: boolean;
  /** A specific staff member was chosen; omitted = "any available". */
  readonly staffId?: string | undefined;
}

export interface AvailabilityInput {
  readonly date: string;
  readonly now: Date;
  readonly timeZone: string;
  readonly slotMinutes: number;
  readonly maxDaysAhead: number;
  readonly minLeadMinutes: number;
  readonly schedule: readonly Pick<ScheduleDay, 'day' | 'isOff' | 'open' | 'close'>[];
  readonly closures: readonly ClosureRange[];
  readonly staff: readonly AvailabilityStaff[];
  readonly leaves: readonly LeaveRange[];
  readonly busy: readonly BusyInterval[];
  readonly person: AvailabilityPerson;
}

export type UnavailableReason = 'PAST' | 'TOO_FAR' | 'CLOSED';

export interface Slot {
  /** Start instant (UTC). */
  readonly start: Date;
  /** Free staff who can take the person for the whole duration, lowest id first. */
  readonly eligibleStaffIds: readonly string[];
  readonly available: boolean;
}

export interface AvailabilityResult {
  readonly date: string;
  /** Why the whole day has no slots; `null` when the day can be booked. */
  readonly reason: UnavailableReason | null;
  readonly slots: readonly Slot[];
}

const dayResult = (date: string, reason: UnavailableReason): AvailabilityResult => ({
  date,
  reason,
  slots: [],
});

const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Slots of one person on one day (BUSINESS_DOMAIN.md §5.4). Pure: every fact (hours, closures,
 * leaves, busy times) comes in as data. Persons of one booking are asked one by one, with the
 * earlier persons' picks passed in as `busy`.
 */
export const computeAvailability = (input: AvailabilityInput): AvailabilityResult => {
  const { date, now, timeZone, person } = input;
  const today = localDateOf(now, timeZone);
  if (date < today) return dayResult(date, 'PAST');
  if (diffDays(today, date) > input.maxDaysAhead) return dayResult(date, 'TOO_FAR');

  const weekday = dayOfWeek(date);
  const salonDay = input.schedule.find((d) => d.day === weekday);
  if (closureOn(date, input.closures) !== undefined || salonDay === undefined || salonDay.isOff) {
    return dayResult(date, 'CLOSED');
  }
  const open = parseHHmm(salonDay.open);
  const close = parseHHmm(salonDay.close);

  // Who can do this person's services today, and between which minutes.
  const windows = new Map<string, { from: number; to: number }>();
  const cannotBook = person.hasBrideOnlyService && !person.isBride;
  if (!cannotBook) {
    for (const member of input.staff) {
      if (!member.active || !member.providesServices) continue;
      if (person.staffId !== undefined && member.id !== person.staffId) continue;
      if (person.isBride && !member.brideQualified) continue;
      if (!person.serviceIds.every((id) => member.serviceIds.includes(id))) continue;
      const works = member.workingDays.find((d) => d.day === weekday);
      if (works === undefined) continue;
      if (input.leaves.some((l) => l.staffId === member.id && l.from <= date && date <= l.to)) {
        continue;
      }
      // Custom hours may only narrow the salon's hours.
      const from = Math.max(open, works.start === undefined ? open : parseHHmm(works.start));
      const to = Math.min(close, works.end === undefined ? close : parseHHmm(works.end));
      if (from < to) windows.set(member.id, { from, to });
    }
  }

  // One conversion per day; the grid is plain minute arithmetic unless the day is not 24 h long.
  const range = localDayRange(date, timeZone);
  const regularDay = range.end.getTime() - range.start.getTime() === MS_PER_DAY;
  const at = (minutes: number): Date =>
    regularDay
      ? new Date(range.start.getTime() + minutes * MS_PER_MINUTE)
      : zonedTimeToUtc(date, minutes, timeZone);
  const earliest = now.getTime() + input.minLeadMinutes * MS_PER_MINUTE;
  const busyOf = new Map<string, BusyInterval[]>();
  for (const interval of input.busy) {
    busyOf.set(interval.staffId, [...(busyOf.get(interval.staffId) ?? []), interval]);
  }

  const slots: Slot[] = [];
  for (let from = open; from + person.durationMinutes <= close; from += input.slotMinutes) {
    const start = at(from);
    if (start.getTime() < earliest) continue;
    const slot = { start, end: new Date(start.getTime() + person.durationMinutes * MS_PER_MINUTE) };
    const free = [...windows]
      .filter(
        ([id, w]) =>
          from >= w.from &&
          from + person.durationMinutes <= w.to &&
          !(busyOf.get(id) ?? []).some((b) => rangesOverlap(slot, b)),
      )
      .map(([id]) => id)
      .sort(byId);
    slots.push({ start, eligibleStaffIds: free, available: free.length > 0 });
  }
  return { date, reason: null, slots };
};

/**
 * "Any available staff" (§5.4 step 6): the free staff member with the fewest bookings that day;
 * a tie goes to the lowest id. `null` when nobody is free.
 */
export const pickAnyStaff = (
  eligibleStaffIds: readonly string[],
  bookingsToday: ReadonlyMap<string, number>,
): string | null => {
  let best: string | null = null;
  for (const id of eligibleStaffIds) {
    if (best === null) {
      best = id;
      continue;
    }
    const mine = bookingsToday.get(id) ?? 0;
    const theirs = bookingsToday.get(best) ?? 0;
    if (mine < theirs || (mine === theirs && id < best)) best = id;
  }
  return best;
};

/** The last bookable date (inclusive) for a `now`: today + `maxDaysAhead`. */
export const lastBookableDate = (now: Date, timeZone: string, maxDaysAhead: number): string =>
  addDays(localDateOf(now, timeZone), maxDaysAhead);
