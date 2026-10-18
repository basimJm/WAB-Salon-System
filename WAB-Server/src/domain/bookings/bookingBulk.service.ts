import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingStatus } from '../../constants/enums';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import { BaseError } from '../../utils/errors';
import type { BookingActionsService, MemberActor } from './bookingActions.service';

export interface CancelAffectedResult {
  readonly bookingId: string;
  readonly outcome: 'DONE' | 'FAILED';
  /** The status the booking ended in (REJECTED for pending, CANCELLED_BY_SALON for approved). */
  readonly status?: BookingStatus;
  /** Domain error code when the booking could not be cancelled (e.g. it already started). */
  readonly code?: string;
}

export interface BookingBulkService {
  /**
   * After a schedule/closure/leave/staff change (BUSINESS_DOMAIN.md §5.12): PENDING bookings are
   * rejected and APPROVED ones cancelled by the salon, with the given reason; refunds follow from the
   * single-booking actions. One failure never stops the rest.
   */
  cancelAffected(input: {
    salonId: string;
    member: MemberActor;
    bookingIds: readonly string[];
    reasonCode: string;
    reasonText?: string | undefined;
  }): Promise<CancelAffectedResult[]>;
}

export const createBookingBulkService = (deps: {
  readonly bookings: Pick<BookingsRepository, 'findById'>;
  readonly actions: BookingActionsService;
}): BookingBulkService => ({
  async cancelAffected({ salonId, member, bookingIds, reasonCode, reasonText }) {
    const results: CancelAffectedResult[] = [];
    for (const bookingId of [...new Set(bookingIds)]) {
      try {
        const booking = await deps.bookings.findById(bookingId);
        if (booking?.salonId !== salonId) {
          results.push({ bookingId, outcome: 'FAILED', code: ERROR_CODES.NOT_FOUND });
          continue;
        }
        const target = { salonId, bookingId, member, reasonCode, reasonText };
        const done =
          booking.status === 'PENDING'
            ? await deps.actions.reject(target)
            : await deps.actions.cancel(target);
        results.push({ bookingId, outcome: 'DONE', status: done.status });
      } catch (error) {
        if (!(error instanceof BaseError)) throw error;
        results.push({ bookingId, outcome: 'FAILED', code: error.code });
      }
    }
    return results;
  },
});
