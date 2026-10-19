import type { Redis } from 'ioredis';
import {
  ADMIN_BOOKING_AUDIT,
  ADMIN_BOOKING_EXTRA_AUDIT,
  STAFF_LOCK_SEGMENT,
  STAFF_LOCK_TTL_MS,
  type AdminCancelMode,
} from '../../constants/bookings';
import { SLOT_HOLDING_STATUSES, type BookingStatus } from '../../constants/enums';
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
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { SettingsService } from '../settings';
import { noBookingChangedHook, type BookingChangedHook } from './bookingActions.service';
import { toSummary, type BookingSummary } from './bookingCreation.service';
import { customerCancelRefund, fullRefund, noShowRefund } from './refunds';
import { TRANSITIONS, applyTransition } from './stateMachine';

export interface AdminStatusChange extends BookingSummary {
  /** True when no actor could make this move by the rules of §5.7 (e.g. reverting a final status). */
  readonly irregular: boolean;
}

export interface BookingAdminService {
  /**
   * Admin: moves a booking to any other status with a mandatory reason (BUSINESS_DOMAIN.md §5.7
   * "any → any"). The change is audited; both parties are told through the hook.
   */
  changeStatus(input: {
    bookingId: string;
    to: BookingStatus;
    reason: string;
    actor: AdminActor;
  }): Promise<AdminStatusChange>;
  /**
   * Admin: cancels a PENDING or APPROVED booking "as" the customer, the salon or the platform
   * (reason + audit); the mode picks the status and the refund rule (`ADMIN_CANCEL_MODES`).
   */
  cancel(input: {
    bookingId: string;
    mode: AdminCancelMode;
    reason: string;
    actor: AdminActor;
  }): Promise<AdminStatusChange>;
}

/** Moves that return what was paid online, by the status the booking ends in. */
const REFUNDED_ENDINGS: readonly BookingStatus[] = [
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'AUTO_CANCELLED',
];

export const createBookingAdminService = (deps: {
  readonly redis: Redis;
  readonly bookings: BookingsRepository;
  readonly members: Pick<MembersRepository, 'incrementCustomers'>;
  readonly audit: AuditWriter;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly hook?: BookingChangedHook;
  readonly now?: () => Date;
}): BookingAdminService => {
  const { redis, bookings, members, audit, settings } = deps;
  const hook = deps.hook ?? noBookingChangedHook;
  const now = deps.now ?? ((): Date => new Date());

  const refundFor = (booking: Entity<BookingRaw>, to: BookingStatus): number | undefined => {
    if (REFUNDED_ENDINGS.includes(to)) return fullRefund(booking);
    if (to === 'NO_SHOW') {
      return noShowRefund({
        paymentMethod: booking.paymentMethod,
        money: booking.money,
        policy: booking.policySnapshot,
      });
    }
    return undefined;
  };

  const effectsOf = (
    to: BookingStatus,
    reason: string,
    actor: AdminActor,
    at: Date,
  ): Record<string, unknown> => {
    const decision = {
      by: 'ADMIN',
      actorId: toObjectId(actor.adminId),
      reasonCode: ADMIN_BOOKING_AUDIT.reasonCode,
      reasonText: reason,
      at,
    };
    switch (to) {
      case 'REJECTED':
        return { rejection: decision };
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_SALON':
      case 'AUTO_CANCELLED':
        return { cancellation: decision };
      case 'COMPLETED':
        return { paymentStatus: 'PAID', completedAt: at };
      case 'NO_SHOW':
        return { noShowAt: at };
      default:
        return {};
    }
  };

  const move = async ({
    bookingId,
    to,
    reason,
    actor,
    action = ADMIN_BOOKING_AUDIT.action,
    refundOf = refundFor,
  }: {
    bookingId: string;
    to: BookingStatus;
    reason: string;
    actor: AdminActor;
    action?: string;
    refundOf?: (booking: Entity<BookingRaw>, to: BookingStatus) => number | undefined;
  }): Promise<AdminStatusChange> => {
    const booking = await bookings.findById(bookingId);
    if (booking === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    const at = now();
    const entry = applyTransition({
      facts: {
        status: booking.status,
        appointmentStart: booking.appointmentStart,
        respondBy: booking.respondBy,
        cancellationWindowHours: booking.policySnapshot.cancellationWindowHours,
      },
      to,
      actor: { type: 'ADMIN', id: actor.adminId },
      reason,
      now: at,
    });
    const irregular = !TRANSITIONS.some((r) => r.from === booking.status && r.to === to);
    const history: StatusHistoryEntry = {
      status: to,
      actorType: 'ADMIN',
      actorId: toObjectId(actor.adminId),
      ...(entry.reason === undefined ? {} : { reason: entry.reason }),
      at,
    };
    const persist = (): Promise<Entity<BookingRaw> | null> =>
      bookings.transition(booking.id, booking.status, {
        set: { status: to, ...effectsOf(to, reason, actor, at) },
        history,
      });

    // Putting a booking back on the calendar needs its staff to still be free.
    const reoccupies =
      (SLOT_HOLDING_STATUSES as readonly BookingStatus[]).includes(to) &&
      !(SLOT_HOLDING_STATUSES as readonly BookingStatus[]).includes(booking.status);
    let updated: Entity<BookingRaw> | null;
    if (reoccupies) {
      const timeZone = await settings.get('timezone');
      const slotTaken = (): ConflictError => new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });
      updated = await withLocks(
        redis,
        booking.persons.map((p) =>
          lockKey(STAFF_LOCK_SEGMENT, p.staffId, localDateOf(p.start, timeZone)),
        ),
        async () => {
          for (const p of booking.persons) {
            if (await bookings.overlapping(p.staffId, p.start, p.end, booking.id)) {
              throw slotTaken();
            }
          }
          return persist();
        },
        { ttlMs: STAFF_LOCK_TTL_MS, busyError: slotTaken },
      );
    } else {
      updated = await persist();
    }
    if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });

    if (to === 'COMPLETED') {
      await Promise.all(
        [...new Set(updated.persons.map((p) => p.staffId))].map((id) =>
          members.incrementCustomers(id),
        ),
      );
    }
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: ADMIN_BOOKING_AUDIT.entityType,
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: to, irregular },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    const refundDue = refundOf(booking, to);
    await hook.changed(
      updated,
      booking.status,
      refundDue === undefined ? undefined : { refundDue },
    );
    return { ...toSummary(updated), irregular };
  };

  return {
    changeStatus: (input) => move(input),

    async cancel({ bookingId, mode, reason, actor }) {
      // Only a booking that is still on the calendar can be cancelled (use `changeStatus` for the rest).
      const current = await bookings.findById(bookingId);
      if (current === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      if (!(SLOT_HOLDING_STATUSES as readonly BookingStatus[]).includes(current.status)) {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      const to: BookingStatus =
        mode === 'CUSTOMER' ? 'CANCELLED_BY_CUSTOMER' : 'CANCELLED_BY_SALON';
      return await move({
        bookingId,
        to,
        reason,
        actor,
        action: ADMIN_BOOKING_EXTRA_AUDIT.cancel,
        // The customer's own cancellation follows the snapshotted policy (everything while PENDING);
        // a salon or platform cancellation returns all that was paid online.
        refundOf: (booking) =>
          mode === 'CUSTOMER'
            ? booking.status === 'PENDING'
              ? fullRefund(booking)
              : customerCancelRefund({
                  paymentMethod: booking.paymentMethod,
                  money: booking.money,
                  policy: booking.policySnapshot,
                })
            : fullRefund(booking),
      });
    },
  };
};
