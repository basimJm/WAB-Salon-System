import { ADMIN_SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/sockets';
import type { RefundRaw } from '../models/refund.model';
import type { ReviewRaw } from '../models/review.model';
import type { SalonRaw } from '../models/salon.model';
import type { Entity } from '../utils/database/plain';
import { formatJod } from '../utils/money';
import type { Logger } from '../utils/logger';
import type { SocketRelay } from './bookingEvents';

/** The admin room events of BUSINESS_DOMAIN.md §7 besides bookings and alerts (SRV-124). */
export interface AdminEvents {
  applicationCreated(salon: Entity<SalonRaw>): void;
  reviewCreated(review: Entity<ReviewRaw>): void;
  refundUpdated(refund: Entity<RefundRaw>): void;
  overviewTick(): void;
}

/**
 * Small summaries only (the panel refetches what it shows); an emit never throws, so a socket
 * problem can never undo the change that triggered it.
 */
export const createAdminEvents = (deps: {
  readonly relay: SocketRelay;
  readonly logger: Logger;
  readonly now?: () => Date;
}): AdminEvents => {
  const now = deps.now ?? ((): Date => new Date());
  const emit = (event: string, payload: Record<string, unknown>): void => {
    try {
      deps.relay.current?.emit('admin', SOCKET_ROOMS.admin, event, payload);
    } catch (error) {
      deps.logger.error({ err: error, event }, 'admin socket event failed');
    }
  };
  return {
    applicationCreated: (salon) => {
      emit(ADMIN_SOCKET_EVENTS.applicationCreated, {
        salonId: salon.id,
        name: salon.name,
        gender: salon.gender,
      });
    },
    reviewCreated: (review) => {
      emit(ADMIN_SOCKET_EVENTS.reviewCreated, {
        id: review.id,
        salonId: review.salonId,
        target: review.target,
        rating: review.rating,
      });
    },
    refundUpdated: (refund) => {
      emit(ADMIN_SOCKET_EVENTS.refundUpdated, {
        id: refund.id,
        bookingId: refund.bookingId ?? null,
        status: refund.status,
        amount: formatJod(refund.amount),
      });
    },
    overviewTick: () => {
      emit(ADMIN_SOCKET_EVENTS.overviewTick, { at: now().toISOString() });
    },
  };
};
