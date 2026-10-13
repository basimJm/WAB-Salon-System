import type { RefundSource } from '../../constants/enums';
import type { BookingRaw } from '../../models/booking.model';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';
import type { BookingChangedHook } from '../bookings/bookingActions.service';
import type { RefundService } from './refunds.service';

/** The refund source of a booking that just ended in `status` (BUSINESS_DOMAIN.md §5.7 side effects). */
const sourceOf = (booking: Entity<BookingRaw>): RefundSource | null => {
  if (booking.statusHistory.at(-1)?.actorType === 'ADMIN') return 'ADMIN';
  switch (booking.status) {
    case 'REJECTED':
      return 'SALON_REJECT';
    case 'CANCELLED_BY_SALON':
      return 'SALON_CANCEL';
    case 'AUTO_CANCELLED':
      return 'AUTO_CANCEL';
    case 'CANCELLED_BY_CUSTOMER':
      return 'CUSTOMER_CANCEL';
    case 'NO_SHOW':
      return 'NO_SHOW_POLICY';
    default:
      return null;
  }
};

/**
 * Turns the `refundDue` of a booking status change into a refund (BUSINESS_DOMAIN.md §5.10). The
 * status change is already stored, so a failure here is logged loudly, never thrown.
 */
export const createRefundHook = (deps: {
  readonly refunds: Pick<RefundService, 'requestForBooking'>;
  readonly logger: Logger;
}): BookingChangedHook => ({
  changed: async (booking, _previous, info) => {
    if (info === undefined || info.refundDue <= 0) return;
    const source = sourceOf(booking);
    if (source === null) return;
    try {
      await deps.refunds.requestForBooking({
        bookingId: booking.id,
        amount: info.refundDue,
        source,
        reason: booking.status,
      });
    } catch (error) {
      deps.logger.error(
        { err: error, bookingId: booking.id, refundDue: info.refundDue },
        'refund could not be started after a booking status change',
      );
    }
  },
});

/** Runs several hooks in turn; one failing hook never stops the others. */
export const composeBookingHooks = (
  hooks: readonly BookingChangedHook[],
  logger: Logger,
): Required<BookingChangedHook> => {
  const each = async (
    task: (hook: BookingChangedHook) => Promise<void> | undefined,
  ): Promise<void> => {
    for (const hook of hooks) {
      try {
        await task(hook);
      } catch (error) {
        logger.error({ err: error }, 'booking hook failed');
      }
    }
  };
  return {
    changed: (booking, previous, info) => each((h) => h.changed(booking, previous, info)),
    reassigned: (booking, change) => each((h) => h.reassigned?.(booking, change)),
  };
};
