import type { DayOfWeek } from '../../constants/time';
import type { ScheduleDay } from '../../models/salon.model';
import { dayOfWeek, localDateOf, localMinutesOf, parseHHmm } from '../../utils/time';
import type { SettingsService } from '../settings';
import type { BookingConflict, ScheduleConflicts } from './hoursService';

/**
 * What the conflict checks need to know about an upcoming PENDING/APPROVED booking (BUSINESS_DOMAIN.md
 * §3.5): one entry per person, with the staff member and services booked and the time range.
 */
export interface BookingPerson {
  readonly staffId: string;
  readonly serviceIds: readonly string[];
  readonly start: Date;
  readonly end: Date;
}
export interface UpcomingBooking {
  readonly id: string;
  readonly status: string;
  /** The booking's branch: hours and closures of one branch only break its own bookings. */
  readonly branchId?: string | undefined;
  readonly startsAt: Date;
  readonly persons: readonly BookingPerson[];
}

/** Where upcoming bookings come from; the booking module provides it (SRV-071), until then none. */
export interface BookingLookup {
  upcomingForSalon(salonId: string, from: Date): Promise<UpcomingBooking[]>;
}
export const noBookings: BookingLookup = { upcomingForSalon: () => Promise.resolve([]) };

const conflict = (b: UpcomingBooking): BookingConflict => ({
  bookingId: b.id,
  startsAt: b.startsAt,
  status: b.status,
});

/** Distinct bookings that have at least one person for whom `broken` is true, soonest first. */
export const bookingsWhere = (
  bookings: readonly UpcomingBooking[],
  broken: (person: BookingPerson) => boolean,
): BookingConflict[] =>
  bookings
    .filter((b) => b.persons.some(broken))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map(conflict);

/** Does the local day of `instant` fall in [from, to] (civil dates, inclusive)? */
const dateIn = (instant: Date, from: string, to: string, timeZone: string): boolean => {
  const date = localDateOf(instant, timeZone);
  return from <= date && date <= to;
};

/** A new weekly schedule breaks a person who is booked on a day off or outside the new hours. */
export const weeklyConflicts = (
  bookings: readonly UpcomingBooking[],
  schedule: readonly Pick<ScheduleDay, 'day' | 'isOff' | 'open' | 'close'>[],
  timeZone: string,
): BookingConflict[] =>
  bookingsWhere(bookings, (person) => {
    const day = schedule.find((d) => d.day === dayOfWeek(localDateOf(person.start, timeZone)));
    if (day === undefined || day.isOff) return true;
    const start = localMinutesOf(person.start, timeZone);
    const end = localMinutesOf(person.end, timeZone);
    const sameDay = localDateOf(person.start, timeZone) === localDateOf(person.end, timeZone);
    // A person who finishes after midnight can never fit hours that end the same day.
    return start < parseHHmm(day.open) || !sameDay || end > parseHHmm(day.close);
  });

/** A closure breaks every person booked on one of its days. */
export const closureConflicts = (
  bookings: readonly UpcomingBooking[],
  range: { from: string; to: string },
  timeZone: string,
): BookingConflict[] =>
  bookingsWhere(bookings, (person) => dateIn(person.start, range.from, range.to, timeZone));

/** A leave breaks the bookings of that staff member on its days. */
export const leaveConflicts = (
  bookings: readonly UpcomingBooking[],
  memberId: string,
  range: { from: string; to: string },
  timeZone: string,
): BookingConflict[] =>
  bookingsWhere(
    bookings,
    (person) => person.staffId === memberId && dateIn(person.start, range.from, range.to, timeZone),
  );

export interface StaffAfter {
  readonly providesServices: boolean;
  readonly serviceIds: readonly string[];
  readonly workingDays: readonly {
    day: DayOfWeek;
    start?: string | undefined;
    end?: string | undefined;
  }[];
}

/**
 * A staff change breaks the member's bookings that need something that is gone: the member no
 * longer provides services, a booked service is no longer a skill, the booked day is no longer a
 * working day, or the booking falls outside the new custom hours.
 */
export const staffConflicts = (
  bookings: readonly UpcomingBooking[],
  memberId: string,
  after: StaffAfter,
  timeZone: string,
): BookingConflict[] =>
  bookingsWhere(bookings, (person) => {
    if (person.staffId !== memberId) return false;
    if (!after.providesServices) return true;
    if (person.serviceIds.some((id) => !after.serviceIds.includes(id))) return true;
    const date = localDateOf(person.start, timeZone);
    const day = after.workingDays.find((d) => d.day === dayOfWeek(date));
    if (day === undefined) return true;
    if (day.start === undefined || day.end === undefined) return false;
    return (
      localMinutesOf(person.start, timeZone) < parseHHmm(day.start) ||
      date !== localDateOf(person.end, timeZone) ||
      localMinutesOf(person.end, timeZone) > parseHHmm(day.end)
    );
  });

/** A deactivated member can no longer serve any upcoming booking. */
export const deactivationConflicts = (
  bookings: readonly UpcomingBooking[],
  memberId: string,
): BookingConflict[] => bookingsWhere(bookings, (person) => person.staffId === memberId);

export interface ConflictFinder {
  readonly schedule: ScheduleConflicts;
  readonly staff: {
    check(input: {
      salonId: string;
      memberId: string;
      after: StaffAfter;
    }): Promise<BookingConflict[]>;
  };
  readonly leave: {
    check(input: {
      salonId: string;
      memberId: string;
      from: string;
      to: string;
    }): Promise<BookingConflict[]>;
  };
  /** Every upcoming booking of the salon (a gender change cannot happen under them). */
  readonly salon: { check(input: { salonId: string }): Promise<BookingConflict[]> };
  readonly deactivation: {
    check(input: { salonId: string; memberId: string }): Promise<BookingConflict[]>;
  };
}

/** The §5.12 checks over the salon's upcoming bookings, in the salon's time zone. */
/** Bookings of one branch (every booking of the salon when no branch is given). */
const inBranch = (list: readonly UpcomingBooking[], branchId?: string): UpcomingBooking[] =>
  branchId === undefined ? [...list] : list.filter((b) => b.branchId === branchId);

export const createConflictFinder = (deps: {
  readonly bookings: BookingLookup;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly now?: () => Date;
}): ConflictFinder => {
  const now = deps.now ?? ((): Date => new Date());
  const load = async (salonId: string): Promise<{ list: UpcomingBooking[]; timeZone: string }> => {
    const [list, timeZone] = await Promise.all([
      deps.bookings.upcomingForSalon(salonId, now()),
      deps.settings.get('timezone'),
    ]);
    return { list, timeZone };
  };
  return {
    schedule: {
      async weekly(salonId, days, branchId) {
        const { list, timeZone } = await load(salonId);
        return weeklyConflicts(inBranch(list, branchId), days, timeZone);
      },
      async closure(salonId, range, branchId) {
        const { list, timeZone } = await load(salonId);
        return closureConflicts(inBranch(list, branchId), range, timeZone);
      },
    },
    staff: {
      async check({ salonId, memberId, after }) {
        const { list, timeZone } = await load(salonId);
        return staffConflicts(list, memberId, after, timeZone);
      },
    },
    leave: {
      async check({ salonId, memberId, from, to }) {
        const { list, timeZone } = await load(salonId);
        return leaveConflicts(list, memberId, { from, to }, timeZone);
      },
    },
    salon: {
      async check({ salonId }) {
        return bookingsWhere((await load(salonId)).list, () => true);
      },
    },
    deactivation: {
      async check({ salonId, memberId }) {
        return deactivationConflicts((await load(salonId)).list, memberId);
      },
    },
  };
};
