import type { Model } from 'mongoose';
import {
  SLOT_HOLDING_STATUSES,
  type BookingRefundStatus,
  type BookingStatus,
} from '../constants/enums';
import type { BookingBusyLookup } from '../domain/availability/availability.service';
import type { BookingLookup, UpcomingBooking } from '../domain/salons/conflicts';
import { ANALYTICS_DAY_FORMAT } from '../constants/adminSalonInsights';
import { BookingModel, type BookingRaw, type StatusHistoryEntry } from '../models/booking.model';
import { isObjectIdString, toObjectId } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository, type Page } from './base.repository';

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
  overlapping(staffId: string, start: Date, end: Date, exceptId?: string): Promise<boolean> {
    return this.exists({
      ...(exceptId !== undefined && isObjectIdString(exceptId)
        ? { _id: { $ne: toObjectId(exceptId) } }
        : {}),
      status: holdingStatus,
      persons: { $elemMatch: { staffId, start: { $lt: end }, end: { $gt: start } } },
    });
  }

  /**
   * Moves a booking from `from` to a new status in one atomic step and appends the history entry;
   * `null` when it is no longer in `from` (someone else decided first) or does not exist.
   */
  async transition(
    id: string,
    from: BookingStatus,
    change: { set: Record<string, unknown>; history: StatusHistoryEntry },
  ): Promise<Entity<BookingRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: from },
        { $set: change.set, $push: { statusHistory: change.history } },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<BookingRaw>(updated);
  }

  /**
   * Replaces the staff member of one person of an APPROVED booking, only while the person still has
   * `from` (so two simultaneous reassignments cannot both win). `null` when nothing matched.
   */
  async reassign(input: {
    id: string;
    personIndex: number;
    from: string;
    to: string;
  }): Promise<Entity<BookingRaw> | null> {
    if (!isObjectIdString(input.id)) return null;
    const path = `persons.${String(input.personIndex)}`;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: input.id, status: 'APPROVED', [`${path}.staffId`]: toObjectId(input.from) },
        {
          $set: {
            [`${path}.staffId`]: toObjectId(input.to),
            [`${path}.staffSelection`]: 'SPECIFIC',
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<BookingRaw>(updated);
  }

  /** Keeps the booking's refund summary in step with its refunds (`refundedDelta` fils just returned). */
  async recordRefund(
    id: string,
    change: { status: BookingRefundStatus; refundedDelta?: number },
  ): Promise<void> {
    if (!isObjectIdString(id)) return;
    await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          $set: { refundStatus: change.status },
          ...(change.refundedDelta === undefined || change.refundedDelta === 0
            ? {}
            : { $inc: { 'money.refunded': change.refundedDelta } }),
        },
      )
      .exec();
  }

  /** Live bookings of a salon that have not ended yet, for the schedule-conflict checks. */
  /** PENDING/APPROVED bookings of one branch that have not ended (closing a branch, §5.16). */
  async upcomingForBranch(branchId: string, from: Date): Promise<{ id: string; startsAt: Date }[]> {
    const found = await this.findMany(
      { branchId, status: holdingStatus, appointmentEnd: { $gt: from } },
      { appointmentStart: 1 },
    );
    return found.map((booking) => ({ id: booking.id, startsAt: booking.appointmentStart }));
  }

  async upcomingForSalon(salonId: string, from: Date): Promise<UpcomingBooking[]> {
    const found = await this.findMany(
      { salonId, status: holdingStatus, appointmentEnd: { $gt: from } },
      { appointmentStart: 1 },
    );
    return found.map((booking) => ({
      id: booking.id,
      status: booking.status,
      ...(booking.branchId === undefined ? {} : { branchId: booking.branchId }),
      startsAt: booking.appointmentStart,
      persons: booking.persons.map((p) => ({
        staffId: p.staffId,
        serviceIds: p.services.map((s) => s.salonServiceId),
        start: p.start,
        end: p.end,
      })),
    }));
  }

  /** One page of bookings that still need background jobs: every PENDING one and upcoming APPROVED ones. */
  jobCandidates(
    now: Date,
    params: { page: number; pageSize: number },
  ): Promise<Page<Entity<BookingRaw>>> {
    return this.findPage(
      { $or: [{ status: 'PENDING' }, { status: 'APPROVED', appointmentStart: { $gt: now } }] },
      params,
      { appointmentStart: 1 },
    );
  }

  /** Bookings of one salon created in `[from, to)`, counted per local calendar day. */
  async dailyCounts(input: {
    salonId: string;
    from: Date;
    to: Date;
    timeZone: string;
  }): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            salonId: toObjectId(input.salonId),
            createdAt: { $gte: input.from, $lt: input.to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: ANALYTICS_DAY_FORMAT,
                date: '$createdAt',
                timezone: input.timeZone,
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  }

  /** Salons with the most bookings created in `[from, to)`, with how they ended. */
  async topSalons(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<{ salonId: string; bookings: number; completed: number; lost: number }[]> {
    const rows = await this.model
      .aggregate<{ _id: unknown; bookings: number; completed: number; lost: number }>([
        { $match: { createdAt: { $gte: from, $lt: to } } },
        {
          $group: {
            _id: '$salonId',
            bookings: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            lost: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        'REJECTED',
                        'CANCELLED_BY_CUSTOMER',
                        'CANCELLED_BY_SALON',
                        'AUTO_CANCELLED',
                        'NO_SHOW',
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { bookings: -1, _id: 1 } },
        { $limit: limit },
      ])
      .exec();
    return rows.map((row) => ({
      salonId: String(row._id),
      bookings: row.bookings,
      completed: row.completed,
      lost: row.lost,
    }));
  }
}
