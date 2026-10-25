import type { Redis } from 'ioredis';
import { STAFF_LOCK_SEGMENT, STAFF_LOCK_TTL_MS } from '../../constants/bookings';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingRaw } from '../../models/booking.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { Entity } from '../../utils/database/plain';
import {
  BaseError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { lockKey } from '../../utils/redis/keys';
import { withLocks } from '../../utils/redis/lock';
import { localDateOf } from '../../utils/time';
import type { AvailabilityService } from '../availability/availability.service';
import type { SettingsService } from '../settings';
import {
  noBookingChangedHook,
  type BookingChangedHook,
  assertBookingInScope,
  type MemberActor,
} from './bookingActions.service';
import { toSummary, type BookingSummary } from './bookingCreation.service';

export interface BookingReassignService {
  /**
   * Moves one person of an APPROVED booking to another staff member (BUSINESS_DOMAIN.md §5.7):
   * the new staff member must pass the §5.4 eligibility for that person and be free.
   */
  reassign(input: {
    salonId: string;
    bookingId: string;
    member: MemberActor;
    personIndex: number;
    staffId: string;
  }): Promise<BookingSummary>;
  /** Admin: the same rules and locks, for any salon, without the merchant permission. */
  reassignAny(input: {
    bookingId: string;
    personIndex: number;
    staffId: string;
  }): Promise<{ booking: BookingSummary; from: string }>;
  /**
   * Admin: the staff members who could take over this person right now (skills, bride
   * qualification, hours, leave and a free slot), the current one excluded. Advisory: the
   * reassignment itself re-checks everything under the staff lock.
   */
  eligibleStaff(input: { bookingId: string; personIndex: number }): Promise<EligibleStaff[]>;
}

export interface EligibleStaff {
  readonly staffId: string;
  readonly name: string;
}

export const createBookingReassignService = (deps: {
  readonly redis: Redis;
  readonly bookings: BookingsRepository;
  readonly availability: Pick<AvailabilityService, 'plan'>;
  readonly settings: Pick<SettingsService, 'get'>;
  /** Needed for the admin's eligible-staff list. */
  readonly members?: Pick<MembersRepository, 'findMany'>;
  readonly hook?: BookingChangedHook;
  readonly now?: () => Date;
}): BookingReassignService => {
  const { redis, bookings, availability, settings } = deps;
  const hook = deps.hook ?? noBookingChangedHook;
  const now = deps.now ?? ((): Date => new Date());

  const personOf = (
    booking: Entity<BookingRaw>,
    personIndex: number,
  ): Entity<BookingRaw>['persons'][number] => {
    const person = booking.persons[personIndex];
    if (person === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return person;
  };

  /** The new staff member must pass the §5.4 eligibility for that person and be free. */
  const check = async (
    booking: Entity<BookingRaw>,
    person: Entity<BookingRaw>['persons'][number],
    staffId: string,
  ): Promise<void> => {
    await availability.plan({
      salonId: booking.salonId,
      // Within the booking's own branch: its staff, hours and closures.
      ...(booking.branchId === undefined ? {} : { branchId: booking.branchId }),
      ignoreLeadTime: true,
      persons: [
        {
          name: person.name,
          isBride: person.isBride,
          serviceIds: person.services.map((s) => s.salonServiceId),
          staffId,
          start: person.start,
        },
      ],
    });
    if (await bookings.overlapping(staffId, person.start, person.end, booking.id)) {
      throw new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });
    }
  };

  /** Shared by the merchant and the admin path; `salonId` (merchant) hides other salons' bookings. */
  const perform = async (input: {
    salonId?: string;
    /** The acting member (merchant path): a branch member stays inside their branch. */
    member?: MemberActor;
    bookingId: string;
    personIndex: number;
    staffId: string;
  }): Promise<{ booking: BookingSummary; from: string }> => {
    const { bookingId, personIndex, staffId } = input;
    const booking = await bookings.findById(bookingId);
    if (booking === null || (input.salonId !== undefined && booking.salonId !== input.salonId)) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    if (input.member !== undefined) assertBookingInScope(booking, input.member);
    const person = personOf(booking, personIndex);
    if (booking.status !== 'APPROVED' || person.start <= now()) {
      throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
    }
    if (person.staffId === staffId) {
      throw new BusinessRuleError({ code: ERROR_CODES.VALIDATION_ERROR });
    }
    const timeZone = await settings.get('timezone');
    const slotTaken = (): ConflictError => new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });

    const updated = await withLocks(
      redis,
      [lockKey(STAFF_LOCK_SEGMENT, staffId, localDateOf(person.start, timeZone))],
      async () => {
        await check(booking, person, staffId);
        return bookings.reassign({
          id: booking.id,
          personIndex,
          from: person.staffId,
          to: staffId,
        });
      },
      { ttlMs: STAFF_LOCK_TTL_MS, busyError: slotTaken },
    );
    if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
    await hook.reassigned?.(updated, { from: person.staffId, to: staffId });
    return { booking: toSummary(updated), from: person.staffId };
  };

  return {
    async reassign({ salonId, bookingId, member, personIndex, staffId }) {
      if (!member.permissions.includes('BOOKINGS_OPERATE')) {
        throw new ForbiddenError({ code: ERROR_CODES.PERMISSION_DENIED });
      }
      return (await perform({ salonId, member, bookingId, personIndex, staffId })).booking;
    },

    reassignAny: ({ bookingId, personIndex, staffId }) =>
      perform({ bookingId, personIndex, staffId }),

    async eligibleStaff({ bookingId, personIndex }) {
      const booking = await bookings.findById(bookingId);
      if (booking === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const person = personOf(booking, personIndex);
      if (booking.status !== 'APPROVED' || person.start <= now()) {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      const candidates =
        (await deps.members?.findMany({
          salonId: booking.salonId,
          ...(booking.branchId === undefined ? {} : { branchId: booking.branchId }),
          active: true,
          providesServices: true,
        })) ?? [];
      const eligible: EligibleStaff[] = [];
      for (const member of candidates) {
        if (member.id === person.staffId) continue;
        try {
          await check(booking, person, member.id);
          eligible.push({
            staffId: member.id,
            name: `${member.firstName} ${member.lastName}`.trim(),
          });
        } catch (error) {
          // Not eligible (a domain rule said no); anything else is a real failure.
          if (!(error instanceof BaseError) || !error.isOperational) throw error;
        }
      }
      return eligible;
    },
  };
};
