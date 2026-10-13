import { effectivePermissions } from '../domain/permissions/permissions';
import type { MembersRepository } from '../repositories/identity.repository';
import { SOCKET_ROOMS } from '../constants/sockets';
import type { SocketServerOptions } from './socketServer';

/**
 * Salon rooms of a merchant socket, by the member's permissions at connect time (BUSINESS_DOMAIN.md §7):
 * `salon:{id}:respond` for BOOKINGS_RESPOND, `salon:{id}:all` for BOOKINGS_VIEW_ALL. A deactivated or
 * unknown member is refused. Customers and admins need no extra rooms.
 */
export const createRoomsFor =
  (members: Pick<MembersRepository, 'findById'>): NonNullable<SocketServerOptions['roomsFor']> =>
  async (scope, claims) => {
    if (scope !== 'merchant') return [];
    const member = await members.findById(claims.subjectId);
    if (member?.active !== true) return null;
    const permissions = effectivePermissions(member);
    return [
      ...(permissions.includes('BOOKINGS_RESPOND')
        ? [SOCKET_ROOMS.salonRespond(member.salonId)]
        : []),
      ...(permissions.includes('BOOKINGS_VIEW_ALL') ? [SOCKET_ROOMS.salonAll(member.salonId)] : []),
    ];
  };
