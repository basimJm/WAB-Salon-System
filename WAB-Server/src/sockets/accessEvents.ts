import { ACCESS_REVOKED_GRACE_MS, ACCOUNT_SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/sockets';
import type { AccessEvents } from '../domain/access/accessEvents';
import type { MembersRepository } from '../repositories/identity.repository';
import type { Logger } from '../utils/logger';
import type { SocketRelay } from './bookingEvents';
import { salonRoomsOf } from './rooms';

/**
 * Account events over Socket.IO. A permission change updates the live socket's salon rooms at once
 * (so a member who lost BOOKINGS_RESPOND stops receiving requests without reconnecting).
 */
export const createAccessEvents = (deps: {
  readonly relay: SocketRelay;
  readonly members: Pick<MembersRepository, 'findById'>;
  readonly logger: Logger;
}): AccessEvents => {
  const { relay, members, logger } = deps;
  const roomOf = (a: { scope: 'customer' | 'merchant'; id: string }): string =>
    a.scope === 'customer' ? SOCKET_ROOMS.customer(a.id) : SOCKET_ROOMS.member(a.id);

  const safely = async (what: string, task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      logger.error({ err: error, what }, 'account socket event failed');
    }
  };

  const revoke = (account: { scope: 'customer' | 'merchant'; id: string }): void => {
    const hub = relay.current;
    if (hub === undefined) return;
    hub.emit(account.scope, roomOf(account), ACCOUNT_SOCKET_EVENTS.accessRevoked, {});
    setTimeout(() => {
      hub.disconnect(account.scope, roomOf(account));
    }, ACCESS_REVOKED_GRACE_MS).unref();
  };

  return {
    permissionsChanged: (memberId) =>
      safely('permissionsChanged', async () => {
        const hub = relay.current;
        if (hub === undefined) return;
        const member = await members.findById(memberId);
        if (member?.active !== true) {
          revoke({ scope: 'merchant', id: memberId });
          return;
        }
        const rooms = salonRoomsOf(member);
        hub.leave('merchant', SOCKET_ROOMS.member(memberId), rooms.all);
        hub.join('merchant', SOCKET_ROOMS.member(memberId), rooms.granted);
        hub.emit(
          'merchant',
          SOCKET_ROOMS.member(memberId),
          ACCOUNT_SOCKET_EVENTS.permissionsUpdated,
          {},
        );
      }),
    accessRevoked: (account) =>
      safely('accessRevoked', () => {
        revoke(account);
        return Promise.resolve();
      }),
    unreadChanged: (account, count) =>
      safely('unreadChanged', () => {
        relay.current?.emit(
          account.scope,
          roomOf(account),
          ACCOUNT_SOCKET_EVENTS.notificationsUnread,
          {
            count,
          },
        );
        return Promise.resolve();
      }),
  };
};
