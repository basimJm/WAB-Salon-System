import type { Redis } from 'ioredis';
import {
  AUTO_CANCEL_REASON,
  STAFF_LOCK_SEGMENT,
  STAFF_LOCK_TTL_MS,
} from '../../constants/bookings';
import type { BookingStatus } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingRaw, StatusHistoryEntry } from '../../models/booking.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
import { lockKey } from '../../utils/redis/keys';
import { withLocks } from '../../utils/redis/lock';
import { localDateOf } from '../../utils/time';
import type { SettingsService } from '../settings';
import { toSummary, type BookingSummary } from './bookingCreation.service';
import { fullRefund, noShowRefund } from './refunds';
import { applyTransition } from './stateMachine';

export interface MemberActor {
  readonly id: string;
  readonly permissions: readonly string[];
}

export interface Decision {
  readonly reasonCode: string;
  readonly reasonText?: string | undefined;
}

interface Target {
  readonly salonId: string;
  readonly bookingId: string;
  readonly member: MemberActor;
}

/** Called after a status change; notifications, sockets, refunds and jobs hook in (later tasks). */
export interface BookingChangedHook {
  /** `refundDue` (fils) is set when the change returns money; the refund task executes it. */
  changed(
    booking: Entity<BookingRaw>,
    previous: BookingStatus,
    info?: { refundDue: number },
  ): Promise<void>;
  /** A person of an approved booking moved to another staff member (notify old/new staff + customer). */
  reassigned?(booking: Entity<BookingRaw>, change: { from: string; to: string }): Promise<void>;
}
export const noBookingChangedHook: BookingChangedHook = { changed: () => Promise.resolve() };

export interface BookingActionsService {
  approve(input: Target): Promise<BookingSummary>;
  reject(input: Target & Decision): Promise<BookingSummary>;
  complete(input: Target): Promise<BookingSummary>;
  noShow(input: Target): Promise<BookingSummary>;
  cancel(input: Target & Decision): Promise<BookingSummary>;
  /** The system ends a PENDING booking nobody answered in time; everything paid is refunded. */
  autoCancel(bookingId: string): Promise<BookingSummary>;
}

export interface BookingActionsDeps {
  readonly redis: Redis;
  readonly bookings: BookingsRepository;
  readonly members: Pick<MembersRepository, 'incrementCustomers'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly hook?: BookingChangedHook;
  readonly now?: () => Date;
}

const reasonOf = (decision: Decision): string => decision.reasonText?.trim() || decision.reasonCode;

export const createBookingActionsService = (deps: BookingActionsDeps): BookingActionsService => {
  const { redis, bookings, members, settings } = deps;
  const hook = deps.hook ?? noBookingChangedHook;
  const now = deps.now ?? ((): Date => new Date());

  /** Validates the move with the state machine, then persists it atomically by expected status. */
  const move = async (
    target: Target,
    to: BookingStatus,
    options: {
      decision?: Decision;
      extra?: (at: Date, entry: StatusHistoryEntry) => Record<string, unknown>;
      afterwards?: (booking: Entity<BookingRaw>) => Promise<void>;
      refundOf?: (booking: Entity<BookingRaw>) => number;
    } = {},
  ): Promise<BookingSummary> => {
    const booking = await bookings.findById(target.bookingId);
    if (booking?.salonId !== target.salonId) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    const at = now();
    const entry = applyTransition({
      facts: {
        status: booking.status,
        appointmentStart: booking.appointmentStart,
        respondBy: booking.respondBy,
        cancellationWindowHours: booking.policySnapshot.cancellationWindowHours,
      },
      to,
      actor: { type: 'MEMBER', id: target.member.id, permissions: target.member.permissions },
      reason: options.decision === undefined ? undefined : reasonOf(options.decision),
      now: at,
    });
    const history: StatusHistoryEntry = {
      status: to,
      actorType: 'MEMBER',
      actorId: toObjectId(target.member.id),
      ...(entry.reason === undefined ? {} : { reason: entry.reason }),
      at,
    };
    const updated = await bookings.transition(booking.id, booking.status, {
      set: { status: to, ...(options.extra?.(at, history) ?? {}) },
      history,
    });
    if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
    await options.afterwards?.(updated);
    const refundDue = options.refundOf?.(booking);
    await hook.changed(
      updated,
      booking.status,
      refundDue === undefined ? undefined : { refundDue },
    );
    return toSummary(updated);
  };

  const decisionRecord = (decision: Decision, member: MemberActor, at: Date): object => ({
    by: 'MEMBER',
    actorId: toObjectId(member.id),
    reasonCode: decision.reasonCode,
    ...(decision.reasonText === undefined ? {} : { reasonText: decision.reasonText }),
    at,
  });

  return {
    async approve(target) {
      const booking = await bookings.findById(target.bookingId);
      if (booking?.salonId !== target.salonId) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      const timeZone = await settings.get('timezone');
      const keys = booking.persons.map((p) =>
        lockKey(STAFF_LOCK_SEGMENT, p.staffId, localDateOf(p.start, timeZone)),
      );
      // The staff member must still be free: other bookings may have been made or approved meanwhile.
      return withLocks(
        redis,
        keys,
        async () => {
          for (const person of booking.persons) {
            if (await bookings.overlapping(person.staffId, person.start, person.end, booking.id)) {
              throw new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });
            }
          }
          return move(target, 'APPROVED');
        },
        {
          ttlMs: STAFF_LOCK_TTL_MS,
          busyError: () => new ConflictError({ code: ERROR_CODES.SLOT_TAKEN }),
        },
      );
    },
    reject(target) {
      return move(target, 'REJECTED', {
        decision: target,
        refundOf: fullRefund,
        extra: (at) => ({ rejection: decisionRecord(target, target.member, at) }),
      });
    },
    cancel(target) {
      return move(target, 'CANCELLED_BY_SALON', {
        decision: target,
        refundOf: fullRefund,
        extra: (at) => ({ cancellation: decisionRecord(target, target.member, at) }),
      });
    },
    complete(target) {
      return move(target, 'COMPLETED', {
        extra: (at) => ({ paymentStatus: 'PAID', completedAt: at }),
        afterwards: async (booking) => {
          const staffIds = new Set(booking.persons.map((p) => p.staffId));
          await Promise.all([...staffIds].map((id) => members.incrementCustomers(id)));
        },
      });
    },
    async autoCancel(bookingId) {
      const booking = await bookings.findById(bookingId);
      if (booking === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const at = now();
      applyTransition({
        facts: {
          status: booking.status,
          appointmentStart: booking.appointmentStart,
          respondBy: booking.respondBy,
          cancellationWindowHours: booking.policySnapshot.cancellationWindowHours,
        },
        to: 'AUTO_CANCELLED',
        actor: { type: 'SYSTEM' },
        now: at,
      });
      const history: StatusHistoryEntry = {
        status: 'AUTO_CANCELLED',
        actorType: 'SYSTEM',
        reason: AUTO_CANCEL_REASON,
        at,
      };
      const updated = await bookings.transition(booking.id, booking.status, {
        set: {
          status: 'AUTO_CANCELLED',
          cancellation: { by: 'SYSTEM', reasonCode: AUTO_CANCEL_REASON, at },
        },
        history,
      });
      if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await hook.changed(updated, booking.status, { refundDue: fullRefund(booking) });
      return toSummary(updated);
    },
    noShow(target) {
      return move(target, 'NO_SHOW', {
        extra: (at) => ({ noShowAt: at }),
        refundOf: (b) =>
          noShowRefund({
            paymentMethod: b.paymentMethod,
            money: b.money,
            policy: b.policySnapshot,
          }),
      });
    },
  };
};
