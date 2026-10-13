import type { Redis } from 'ioredis';
import { STAFF_LOCK_SEGMENT, STAFF_LOCK_TTL_MS } from '../../constants/bookings';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import {
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
}

export const createBookingReassignService = (deps: {
  readonly redis: Redis;
  readonly bookings: BookingsRepository;
  readonly availability: Pick<AvailabilityService, 'plan'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly hook?: BookingChangedHook;
  readonly now?: () => Date;
}): BookingReassignService => {
  const { redis, bookings, availability, settings } = deps;
  const hook = deps.hook ?? noBookingChangedHook;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async reassign({ salonId, bookingId, member, personIndex, staffId }) {
      if (!member.permissions.includes('BOOKINGS_OPERATE')) {
        throw new ForbiddenError({ code: ERROR_CODES.PERMISSION_DENIED });
      }
      const booking = await bookings.findById(bookingId);
      if (booking?.salonId !== salonId) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const person = booking.persons[personIndex];
      if (person === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
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
          // Eligibility (skills, bride qualification, hours, leave) and freedom of the new staff member.
          await availability.plan({
            salonId,
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
            throw slotTaken();
          }
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
      return toSummary(updated);
    },
  };
};
