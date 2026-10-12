import type { Session } from '@/domain/auth/auth';

type Listener = () => void;

/** In-memory session (token never touches web storage). Compatible with useSyncExternalStore. */
export interface SessionStore {
  get: () => Session | null;
  set: (session: Session) => void;
  clear: () => void;
  subscribe: (listener: Listener) => () => void;
}

export function createSessionStore(): SessionStore {
  let current: Session | null = null;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());
  return {
    get: () => current,
    set(session) {
      current = session;
      emit();
    },
    clear() {
      if (current === null) return;
      current = null;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
