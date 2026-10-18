/** Admin session rules (Admin PRD §4, BUSINESS_DOMAIN `admin.sessionIdleSec = 1800`). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** The warning dialog opens this long before the idle timeout ends the session. */
export const IDLE_WARNING_MS = 60 * 1000;
/** An access token that expires within this time is refreshed before the next request. */
export const REFRESH_SKEW_MS = 60 * 1000;
export const IDLE_TICK_MS = 1000;
/** Real user input that counts as activity (mouse movement alone does not). */
export const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
export const ACTIVITY_THROTTLE_MS = 1000;
export const MS_PER_SECOND = 1000;

/** Why a session ended without the admin pressing "Sign out". Shown on the login page. */
export const SESSION_END_REASONS = ['expired', 'idle'] as const;
export type SessionEndReason = (typeof SESSION_END_REASONS)[number];
