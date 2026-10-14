import { io, type Socket } from 'socket.io-client';
import {
  REALTIME_AUTH_FIELD,
  REALTIME_CONNECT_ERRORS,
  REALTIME_NAMESPACE,
  REALTIME_RECONNECT,
  REALTIME_SOCKET_PATH,
} from '@/constants/realtime';
import type { RealtimeClient, RealtimeHandler } from '@/domain/realtime/realtime';
import type { Logger } from '@/infrastructure/logger/logger';
import { createStatusStore } from './statusStore';

const isDenied = (error: Error): boolean =>
  error.message === REALTIME_CONNECT_ERRORS.unauthorized ||
  error.message === REALTIME_CONNECT_ERRORS.forbidden;

/** Socket.IO on the server's `/admin` namespace; the access token travels in `auth.token`. */
export class SocketIoRealtimeClient implements RealtimeClient {
  private socket: Socket | null = null;
  private readonly store = createStatusStore();
  private readonly handlers = new Map<string, Set<RealtimeHandler>>();

  constructor(
    private readonly baseUrl: string,
    private readonly logger: Logger,
  ) {}

  connect(getToken: () => string | null): void {
    if (this.socket) return;
    this.store.set('connecting');
    const socket = io(`${this.baseUrl}${REALTIME_NAMESPACE}`, {
      path: REALTIME_SOCKET_PATH,
      transports: ['websocket'],
      reconnectionDelay: REALTIME_RECONNECT.baseMs,
      reconnectionDelayMax: REALTIME_RECONNECT.maxMs,
      randomizationFactor: REALTIME_RECONNECT.randomization,
      auth: (done) => done({ [REALTIME_AUTH_FIELD]: getToken() }),
    });
    socket.on('connect', () => this.store.set('live'));
    socket.on('disconnect', () => this.store.set('reconnecting'));
    socket.on('connect_error', (error) => {
      if (isDenied(error)) {
        // The server refused this token: retrying with the same one cannot work, the session layer handles sign-in.
        this.logger.warn('realtime.denied', { reason: error.message });
        this.store.set('denied');
        socket.disconnect();
        return;
      }
      this.store.set('reconnecting');
    });
    this.handlers.forEach((set, event) => set.forEach((h) => socket.on(event, h)));
    this.socket = socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.store.set('idle');
  }

  on(event: string, handler: RealtimeHandler): () => void {
    const set = this.handlers.get(event) ?? new Set<RealtimeHandler>();
    set.add(handler);
    this.handlers.set(event, set);
    this.socket?.on(event, handler);
    return () => {
      set.delete(handler);
      this.socket?.off(event, handler);
    };
  }

  status = () => this.store.get();
  onStatus = (listener: Parameters<typeof this.store.subscribe>[0]) =>
    this.store.subscribe(listener);
}
