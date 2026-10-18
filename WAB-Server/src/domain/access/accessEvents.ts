/**
 * Real-time account events the domain triggers (BUSINESS_DOMAIN.md §7): the sockets layer
 * implements it, so domain code never imports Socket.IO. All methods are best effort and never throw.
 */
export interface AccessEvents {
  /** A member's role or permissions changed: tell the app and refresh the live socket's rooms. */
  permissionsChanged(memberId: string): Promise<void>;
  /** The account lost access (blocked, deactivated, deletion requested): tell it and hang up. */
  accessRevoked(account: { scope: 'customer' | 'merchant'; id: string }): Promise<void>;
  /** The unread notification counter of an account changed. */
  unreadChanged(
    account: { scope: 'customer' | 'merchant'; id: string },
    count: number,
  ): Promise<void>;
}

export const noAccessEvents: AccessEvents = {
  permissionsChanged: () => Promise.resolve(),
  accessRevoked: () => Promise.resolve(),
  unreadChanged: () => Promise.resolve(),
};
