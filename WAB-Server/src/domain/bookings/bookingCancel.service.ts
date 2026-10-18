import { CUSTOMER_CANCEL_REASON_CODE } from '../../constants/bookings';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import { toObjectId } from '../../utils/database/ids';
import { BusinessRuleError, NotFoundError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import { noBookingChangedHook, type BookingChangedHook } from './bookingActions.service';
import { toSummary, type BookingSummary } from './bookingCreation.service';
import { customerCancelRefund, fullRefund } from './refunds';
import { applyTransition } from './stateMachine';

export interface CustomerCancelResult extends BookingSummary {
  /** JOD decimal string: what will be returned to the customer (executed by the refund flow). */
  readonly refundDue: string;
}

export interface BookingCancelService {
  /** PENDING any time (full refund); APPROVED inside the salon's window (BUSINESS_DOMAIN.md §5.8). */
  cancel(input: {
    customerId: string;
    bookingId: string;
    reasonText?: string | undefined;
  }): Promise<CustomerCancelResult>;
}

export const createBookingCancelService = (deps: {
  readonly bookings: BookingsRepository;
  readonly hook?: BookingChangedHook;
  readonly now?: () => Date;
}): BookingCancelService => {
  const { bookings } = deps;
  const hook = deps.hook ?? noBookingChangedHook;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async cancel({ customerId, bookingId, reasonText }) {
      const booking = await bookings.findById(bookingId);
      if (booking?.customerId !== customerId) {
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
        to: 'CANCELLED_BY_CUSTOMER',
        actor: { type: 'CUSTOMER', id: customerId },
        reason: reasonText,
        now: at,
      });
      const facts = {
        paymentMethod: booking.paymentMethod,
        money: booking.money,
        policy: booking.policySnapshot,
      };
      const refundDue =
        booking.status === 'PENDING' ? fullRefund(facts) : customerCancelRefund(facts);
      const updated = await bookings.transition(booking.id, booking.status, {
        set: {
          status: 'CANCELLED_BY_CUSTOMER',
          cancellation: {
            by: 'CUSTOMER',
            actorId: toObjectId(customerId),
            reasonCode: CUSTOMER_CANCEL_REASON_CODE,
            ...(entry.reason === undefined ? {} : { reasonText: entry.reason }),
            at,
          },
        },
        history: {
          status: 'CANCELLED_BY_CUSTOMER',
          actorType: 'CUSTOMER',
          actorId: toObjectId(customerId),
          ...(entry.reason === undefined ? {} : { reason: entry.reason }),
          at,
        },
      });
      if (updated === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await hook.changed(updated, booking.status, { refundDue });
      return { ...toSummary(updated), refundDue: formatJod(refundDue) };
    },
  };
};
