import type { Session } from './auth';

/** True when the access token is known to expire within `skewMs` (or already has). Unknown expiry = false. */
export const isExpiringSoon = (session: Session, now: number, skewMs: number): boolean =>
  session.accessExpiresAt !== undefined && session.accessExpiresAt - now <= skewMs;

/** True when a refresh token exists and has not expired. */
export const canRefresh = (session: Session, now: number): boolean =>
  session.refreshToken !== undefined &&
  (session.refreshExpiresAt === undefined || session.refreshExpiresAt > now);

export type IdleState = 'active' | 'warning' | 'expired';

export interface IdleStatus {
  readonly state: IdleState;
  /** Whole seconds left until the session ends (rounded up); 0 once expired. */
  readonly secondsLeft: number;
}

/** Where the idle countdown stands: nothing for `idleMs - warnMs`, then a warning, then expired. */
export function idleStatus(
  lastActivity: number,
  now: number,
  idleMs: number,
  warnMs: number,
): IdleStatus {
  const left = lastActivity + idleMs - now;
  if (left <= 0) return { state: 'expired', secondsLeft: 0 };
  const secondsLeft = Math.ceil(left / 1000);
  return { state: left <= warnMs ? 'warning' : 'active', secondsLeft };
}
