import { ADMIN_BOOKING_EXTRA_AUDIT, type AdminCancelMode } from '../../constants/bookings';
import type { RefundRaw } from '../../models/refund.model';
import type { Entity } from '../../utils/database/plain';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { RefundService } from '../refunds/refunds.service';
import type { AdminStatusChange, BookingAdminService } from './bookingAdmin.service';
import type { BookingSummary } from './bookingCreation.service';
import type { BookingReassignService, EligibleStaff } from './bookingReassign.service';

export interface BookingAdminExtrasService {
  eligibleStaff(input: { bookingId: string; personIndex: number }): Promise<EligibleStaff[]>;
  /** Moves one person to another eligible staff member (customer, salon and staff are told). */
  reassign(input: {
    bookingId: string;
    personIndex: number;
    staffId: string;
    reason: string;
    actor: AdminActor;
  }): Promise<BookingSummary>;
  cancel(input: {
    bookingId: string;
    mode: AdminCancelMode;
    reason: string;
    actor: AdminActor;
  }): Promise<AdminStatusChange>;
  /** Refunds `amount` fils (at most what is still refundable); works through the refund engine. */
  refund(input: {
    bookingId: string;
    amount: number;
    reason: string;
    actor: AdminActor;
  }): Promise<Entity<RefundRaw>>;
}

export interface BookingAdminExtrasDeps {
  readonly reassign: Pick<BookingReassignService, 'reassignAny' | 'eligibleStaff'>;
  readonly admin: Pick<BookingAdminService, 'cancel'>;
  readonly refunds: Pick<RefundService, 'refundBookingAmount'>;
  readonly audit: AuditWriter;
}

/** Admin PRD A15 extras on top of the booking engine; every rule stays in the services below. */
export const createBookingAdminExtrasService = (
  deps: BookingAdminExtrasDeps,
): BookingAdminExtrasService => ({
  eligibleStaff: (input) => deps.reassign.eligibleStaff(input),

  async reassign({ bookingId, personIndex, staffId, reason, actor }) {
    const { booking, from } = await deps.reassign.reassignAny({ bookingId, personIndex, staffId });
    await deps.audit.record({
      adminId: actor.adminId,
      action: ADMIN_BOOKING_EXTRA_AUDIT.reassign,
      entityType: ADMIN_BOOKING_EXTRA_AUDIT.entityType,
      entityId: bookingId,
      before: { personIndex, staffId: from },
      after: { personIndex, staffId },
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return booking;
  },

  cancel: (input) => deps.admin.cancel(input),

  refund: (input) => deps.refunds.refundBookingAmount(input),
});
