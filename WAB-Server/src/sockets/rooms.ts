import { effectivePermissions } from '../domain/permissions/permissions';
import type { MembersRepository } from '../repositories/identity.repository';
import { SOCKET_ROOMS } from '../constants/sockets';
import type { SocketServerOptions } from './socketServer';

/**
 * Rooms of a merchant socket, by the member's permissions at connect time (BUSINESS_DOMAIN.md §7):
 * the owner sits in `salon:{id}:respond|all` (every branch), a branch member in
 * `branch:{id}:respond|all` of their branch. A deactivated or unknown member is refused.
 */
/** The salon rooms a member may sit in, and the ones their permissions grant right now. */
export const salonRoomsOf = (member: {
  salonId: string;
  branchId?: string | undefined;
  role: Parameters<typeof effectivePermissions>[0]['role'];
  permissions: Parameters<typeof effectivePermissions>[0]['permissions'];
}): { all: string[]; granted: string[] } => {
  const permissions = effectivePermissions(member);
  // The owner hears every branch (salon rooms); a branch member only their branch (§7).
  const branchId = member.role === 'OWNER' ? undefined : member.branchId;
  const respond =
    branchId === undefined
      ? SOCKET_ROOMS.salonRespond(member.salonId)
      : SOCKET_ROOMS.branchRespond(branchId);
  const viewAll =
    branchId === undefined
      ? SOCKET_ROOMS.salonAll(member.salonId)
      : SOCKET_ROOMS.branchAll(branchId);
  // `all` = every room a refresh must leave first: the salon rooms too (a member's role may change).
  const salonRooms = [
    SOCKET_ROOMS.salonRespond(member.salonId),
    SOCKET_ROOMS.salonAll(member.salonId),
  ];
  return {
    all: [...new Set([...salonRooms, respond, viewAll])],
    granted: [
      ...(permissions.includes('BOOKINGS_RESPOND') ? [respond] : []),
      ...(permissions.includes('BOOKINGS_VIEW_ALL') ? [viewAll] : []),
    ],
  };
};

export const createRoomsFor =
  (members: Pick<MembersRepository, 'findById'>): NonNullable<SocketServerOptions['roomsFor']> =>
  async (scope, claims) => {
    if (scope !== 'merchant') return [];
    const member = await members.findById(claims.subjectId);
    if (member?.active !== true) return null;
    return salonRoomsOf(member).granted;
  };
