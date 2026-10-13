import type { Model } from 'mongoose';
import { SLOT_HOLDING_STATUSES } from '../constants/enums';
import type { BookingBusyLookup } from '../domain/availability/availability.service';
import type { BookingLookup, UpcomingBooking } from '../domain/salons/conflicts';
import { BookingModel, type BookingRaw } from '../models/booking.model';
import { BaseRepository } from './base.repository';

/** Bookings that occupy staff time: PENDING and APPROVED (BUSINESS_DOMAIN.md §5.6). */
const holdingStatus = { $in: [...SLOT_HOLDING_STATUSES] };

export class BookingsRepository
  extends BaseRepository<BookingRaw>
  implements BookingBusyLookup, BookingLookup
{
  constructor(model: Model<BookingRaw> = BookingModel) {
    super(model);
  }

  /** The busy times of a salon's staff inside `[from, to)`: one interval per booked person. */
  async busy({
    salonId,
    from,
    to,
  }: {
    salonId: string;
    from: Date;
    to: Date;
  }): Promise<{ staffId: string; start: Date; end: Date }[]> {
    const found = await this.findMany({
      salonId,
      status: holdingStatus,
      appointmentStart: { $lt: to },
      appointmentEnd: { $gt: from },
    });
    return found
      .flatMap((booking) => booking.persons)
      .filter((p) => p.start < to && p.end > from)
      .map((p) => ({ staffId: p.staffId, start: p.start, end: p.end }));
  }

  /** Does this staff member already have a live booking overlapping `[start, end)`? */
  overlapping(staffId: string, start: Date, end: Date): Promise<boolean> {
    return this.exists({
      status: holdingStatus,
      persons: { $elemMatch: { staffId, start: { $lt: end }, end: { $gt: start } } },
    });
  }

  /** Live bookings of a salon that have not ended yet, for the schedule-conflict checks. */
  async upcomingForSalon(salonId: string, from: Date): Promise<UpcomingBooking[]> {
    const found = await this.findMany(
      { salonId, status: holdingStatus, appointmentEnd: { $gt: from } },
      { appointmentStart: 1 },
    );
    return found.map((booking) => ({
      id: booking.id,
      status: booking.status,
      startsAt: booking.appointmentStart,
      persons: booking.persons.map((p) => ({
        staffId: p.staffId,
        serviceIds: p.services.map((s) => s.salonServiceId),
        start: p.start,
        end: p.end,
      })),
    }));
  }
}
