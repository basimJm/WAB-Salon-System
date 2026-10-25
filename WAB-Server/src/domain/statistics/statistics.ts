import type { BookingStatus } from '../../constants/enums';
import { BOOKING_STATUSES } from '../../constants/enums';
import {
  ATTENDED_BOOKING_STATUSES,
  CANCELLED_BOOKING_STATUSES,
  STATISTICS_PERCENT,
  STATISTICS_RATE_SCALE,
  STATISTICS_TOP_COUNT,
} from '../../constants/statistics';
import { MS_PER_MINUTE } from '../../constants/time';
import type { BookingRaw } from '../../models/booking.model';
import type { Entity } from '../../utils/database/plain';
import { localDateOf } from '../../utils/time';

/** The booking facts the statistics read (a subset of the stored booking). */
export type StatisticsBooking = Pick<
  Entity<BookingRaw>,
  'status' | 'appointmentStart' | 'createdAt' | 'hasBride' | 'statusHistory' | 'money' | 'persons'
>;

export interface BookingKpis {
  readonly total: number;
  readonly byStatus: Record<BookingStatus, number>;
  /** Percent of answered requests that were approved (null when none was answered). */
  readonly approvalRate: number | null;
  readonly cancellationRate: number | null;
  /** Percent of finished visits that were no-shows. */
  readonly noShowRate: number | null;
  /** Minutes from request to the salon's answer, on average (null when none was answered). */
  readonly averageResponseMinutes: number | null;
  readonly brideBookings: number;
  /** Integer fils: collected online (net of refunds) and paid at the salon on completion. */
  readonly revenue: { readonly online: number; readonly atSalon: number; readonly total: number };
}

export interface DaySeries {
  readonly date: string;
  readonly bookings: number;
  readonly revenue: number;
}

export interface Ranked {
  readonly id: string;
  readonly bookings: number;
}

const percent = (part: number, whole: number): number | null =>
  whole === 0
    ? null
    : Math.round((part / whole) * STATISTICS_PERCENT * STATISTICS_RATE_SCALE) /
      STATISTICS_RATE_SCALE;

const has = (list: readonly BookingStatus[], status: BookingStatus): boolean =>
  list.includes(status);

/** Revenue of one booking in fils: online money kept, plus the rest when paid at the salon. */
const revenueOf = (b: StatisticsBooking): { online: number; atSalon: number } => ({
  online: Math.max(0, b.money.paidOnline - b.money.refunded),
  atSalon: b.status === 'COMPLETED' ? b.money.remaining : 0,
});

/** The first answer (approval or rejection) by the salon, if any. */
const answeredAt = (b: StatisticsBooking): Date | undefined =>
  b.statusHistory.find(
    (h) => (h.status === 'APPROVED' || h.status === 'REJECTED') && h.actorType !== 'SYSTEM',
  )?.at;

/** KPIs of M21 over bookings whose appointment falls in the period. Pure. */
export const bookingKpis = (bookings: readonly StatisticsBooking[]): BookingKpis => {
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<
    BookingStatus,
    number
  >;
  let approved = 0;
  let rejected = 0;
  let responseMs = 0;
  let answered = 0;
  let online = 0;
  let atSalon = 0;
  for (const b of bookings) {
    byStatus[b.status] += 1;
    if (b.statusHistory.some((h) => h.status === 'APPROVED')) approved += 1;
    if (b.status === 'REJECTED') rejected += 1;
    const at = answeredAt(b);
    if (at !== undefined) {
      responseMs += at.getTime() - b.createdAt.getTime();
      answered += 1;
    }
    const money = revenueOf(b);
    online += money.online;
    atSalon += money.atSalon;
  }
  const cancelled = CANCELLED_BOOKING_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
  return {
    total: bookings.length,
    byStatus,
    approvalRate: percent(approved, approved + rejected),
    cancellationRate: percent(cancelled, bookings.length),
    noShowRate: percent(byStatus.NO_SHOW, byStatus.NO_SHOW + byStatus.COMPLETED),
    averageResponseMinutes:
      answered === 0 ? null : Math.round(responseMs / answered / MS_PER_MINUTE),
    brideBookings: bookings.filter((b) => b.hasBride).length,
    revenue: { online, atSalon, total: online + atSalon },
  };
};

/** Bookings and revenue per local appointment day, every day of the period included. */
export const daySeries = (
  bookings: readonly StatisticsBooking[],
  days: readonly string[],
  timeZone: string,
): DaySeries[] => {
  const byDay = new Map(days.map((date) => [date, { bookings: 0, revenue: 0 }]));
  for (const b of bookings) {
    const day = byDay.get(localDateOf(b.appointmentStart, timeZone));
    if (day === undefined) continue;
    day.bookings += 1;
    const money = revenueOf(b);
    day.revenue += money.online + money.atSalon;
  }
  return days.map((date) => ({ date, ...(byDay.get(date) ?? { bookings: 0, revenue: 0 }) }));
};

/** Most booked salon services and staff among bookings that took place (or will). */
export const rankings = (
  bookings: readonly StatisticsBooking[],
): { services: Ranked[]; staff: Ranked[] } => {
  const services = new Map<string, number>();
  const staff = new Map<string, number>();
  for (const b of bookings) {
    if (!has(ATTENDED_BOOKING_STATUSES, b.status)) continue;
    for (const person of b.persons) {
      staff.set(person.staffId, (staff.get(person.staffId) ?? 0) + 1);
      for (const service of person.services) {
        services.set(service.salonServiceId, (services.get(service.salonServiceId) ?? 0) + 1);
      }
    }
  }
  const top = (counts: Map<string, number>): Ranked[] =>
    [...counts.entries()]
      .map(([id, count]) => ({ id, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings || a.id.localeCompare(b.id))
      .slice(0, STATISTICS_TOP_COUNT);
  return { services: top(services), staff: top(staff) };
};
