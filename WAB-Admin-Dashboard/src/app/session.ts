import type { SessionEndReason } from '@/constants/session';
import type { Session } from '@/domain/auth/auth';

type Listener = () => void;

/** In-memory session (token never touches web storage). Compatible with useSyncExternalStore. */
export interface SessionStore {
  get: () => Session | null;
  set: (session: Session) => void;
  /** Ends the session; `reason` explains an end the admin did not ask for (shown on the login page). */
  clear: (reason?: SessionEndReason) => void;
  /** Why the last session ended, until the next sign-in. */
  endReason: () => SessionEndReason | null;
  subscribe: (listener: Listener) => () => void;
}

export function createSessionStore(): SessionStore {
  let current: Session | null = null;
  let ended: SessionEndReason | null = null;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => current,
    set(session) {
      current = session;
      ended = null;
      emit();
    },
    clear(reason) {
      if (current === null) return;
      current = null;
      ended = reason ?? null;
      emit();
    },
    endReason: () => ended,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
