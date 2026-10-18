import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/sockets';
import type { BookingChangedHook } from '../domain/bookings/bookingActions.service';
import type { BookingCreatedHook } from '../domain/bookings/bookingCreation.service';
import { effectivePermissions } from '../domain/permissions/permissions';
import type { BookingRaw } from '../models/booking.model';
import type { CustomersRepository, MembersRepository } from '../repositories/identity.repository';
import type { Entity } from '../utils/database/plain';
import { formatJod } from '../utils/money';
import type { Logger } from '../utils/logger';
import type { SocketHub } from './socketServer';

/** The hub exists only after the HTTP server started; services get this reference at build time. */
export interface SocketRelay {
  current?: SocketHub;
}

export type BookingEvents = BookingCreatedHook & Required<BookingChangedHook>;

/** What every real-time booking payload carries (the apps de-duplicate by `id`). */
const summaryOf = (b: Entity<BookingRaw>): Record<string, unknown> => ({
  id: b.id,
  referenceNumber: b.referenceNumber,
  status: b.status,
  paymentStatus: b.paymentStatus,
  hasBride: b.hasBride,
  appointmentStart: b.appointmentStart.toISOString(),
  appointmentEnd: b.appointmentEnd.toISOString(),
  respondBy: b.respondBy.toISOString(),
  total: formatJod(b.money.total),
  personsCount: b.persons.length,
});

/**
 * Emits the booking events of BUSINESS_DOMAIN.md §7 to the right rooms. It plugs into the hooks of
 * the booking services and never throws: a failed emit is logged and must not undo a booking change.
 */
export const createBookingEvents = (deps: {
  readonly relay: SocketRelay;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findById'>;
  readonly logger: Logger;
}): BookingEvents => {
  const { relay, customers, members, logger } = deps;

  const safely = async (what: string, task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      logger.error({ err: error, what }, 'booking socket event failed');
    }
  };

  /** Staff of the booking who may see bookings at all (VIEW_OWN or VIEW_ALL). */
  const viewers = async (staffIds: readonly string[]): Promise<string[]> => {
    const found = await Promise.all(
      [...new Set(staffIds)].map(async (id) => {
        const member = await members.findById(id);
        if (member?.active !== true) return null;
        const permissions = effectivePermissions(member);
        return permissions.includes('BOOKINGS_VIEW_OWN') ||
          permissions.includes('BOOKINGS_VIEW_ALL')
          ? id
          : null;
      }),
    );
    return found.filter((id): id is string => id !== null);
  };

  const updated = async (
    b: Entity<BookingRaw>,
    event: string,
    extraStaff: readonly string[] = [],
  ): Promise<void> => {
    const hub = relay.current;
    if (hub === undefined) return;
    const payload = summaryOf(b);
    hub.emit('customer', SOCKET_ROOMS.customer(b.customerId), event, payload);
    hub.emit('merchant', SOCKET_ROOMS.salonAll(b.salonId), event, payload);
    hub.emit('admin', SOCKET_ROOMS.admin, event, payload);
    for (const id of await viewers([...b.persons.map((p) => p.staffId), ...extraStaff])) {
      hub.emit('merchant', SOCKET_ROOMS.member(id), event, payload);
    }
  };

  return {
    created: (b) =>
      safely('created', async () => {
        const hub = relay.current;
        if (hub === undefined) return;
        const customer = await customers.findById(b.customerId);
        // The request card of M10; members answering requests see it, everyone else the update.
        hub.emit('merchant', SOCKET_ROOMS.salonRespond(b.salonId), SOCKET_EVENTS.bookingRequested, {
          ...summaryOf(b),
          customerName: `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim(),
          services: [
            ...new Map(
              b.persons.flatMap((p) => p.services).map((s) => [s.salonServiceId, s.name]),
            ).values(),
          ],
        });
        await updated(b, SOCKET_EVENTS.bookingUpdated);
      }),
    changed: (b) => safely('changed', () => updated(b, SOCKET_EVENTS.bookingUpdated)),
    reassigned: (b, change) =>
      safely('reassigned', async () => {
        const hub = relay.current;
        if (hub === undefined) return;
        await updated(b, SOCKET_EVENTS.bookingUpdated, [change.from]);
        for (const id of await viewers([change.to])) {
          hub.emit(
            'merchant',
            SOCKET_ROOMS.member(id),
            SOCKET_EVENTS.bookingAssigned,
            summaryOf(b),
          );
        }
      }),
  };
};
