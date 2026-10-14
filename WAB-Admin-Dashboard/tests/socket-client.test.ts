import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/infrastructure/logger/logger';

type Listener = (arg?: Error) => void;
const sockets: FakeSocket[] = [];
class FakeSocket {
  listeners = new Map<string, Listener[]>();
  disconnected = false;
  constructor(
    public url: string,
    public options: { auth: (done: (data: unknown) => void) => void },
  ) {
    sockets.push(this);
  }
  on(event: string, fn: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), fn]);
    return this;
  }
  off(event: string, fn: Listener) {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((l) => l !== fn),
    );
  }
  disconnect() {
    this.disconnected = true;
  }
  fire(event: string, arg?: Error) {
    (this.listeners.get(event) ?? []).forEach((l) => l(arg));
  }
}
vi.mock('socket.io-client', () => ({
  io: (url: string, options: FakeSocket['options']) => new FakeSocket(url, options),
}));

const { SocketIoRealtimeClient } = await import('@/data/realtime/SocketIoRealtimeClient');
const make = () => new SocketIoRealtimeClient('https://api.example.test', createLogger('silent'));

beforeEach(() => (sockets.length = 0));

describe('SocketIoRealtimeClient', () => {
  it('joins the /admin namespace and sends the current token on every (re)connect', () => {
    let token: string | null = 't1';
    make().connect(() => token);
    const socket = sockets[0];
    expect(socket?.url).toBe('https://api.example.test/admin');
    const sent: unknown[] = [];
    socket?.options.auth((d) => sent.push(d));
    token = 't2';
    socket?.options.auth((d) => sent.push(d));
    expect(sent).toEqual([{ token: 't1' }, { token: 't2' }]);
  });

  it('follows connect, drop and retry as live, reconnecting, live', () => {
    const client = make();
    const seen: string[] = [];
    client.onStatus((s) => seen.push(s));
    client.connect(() => 't');
    sockets[0]?.fire('connect');
    sockets[0]?.fire('disconnect');
    sockets[0]?.fire('connect_error', new Error('xhr poll error'));
    sockets[0]?.fire('connect');
    expect(seen).toEqual(['connecting', 'live', 'reconnecting', 'live']);
  });

  it.each(['UNAUTHORIZED', 'FORBIDDEN'])('%s stops retrying and reports denied', (code) => {
    const client = make();
    client.connect(() => 't');
    sockets[0]?.fire('connect_error', new Error(code));
    expect(client.status()).toBe('denied');
    expect(sockets[0]?.disconnected).toBe(true);
  });

  it('keeps handlers registered before and after connecting, and unsubscribes', () => {
    const client = make();
    const early = vi.fn();
    client.on('alert.created', early);
    client.connect(() => 't');
    const late = vi.fn();
    const off = client.on('alert.created', late);
    sockets[0]?.fire('alert.created');
    off();
    sockets[0]?.fire('alert.created');
    expect(early).toHaveBeenCalledTimes(2);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('disconnect closes the socket and returns to idle; connect twice opens one socket', () => {
    const client = make();
    client.connect(() => 't');
    client.connect(() => 't');
    expect(sockets).toHaveLength(1);
    client.disconnect();
    expect(sockets[0]?.disconnected).toBe(true);
    expect(client.status()).toBe('idle');
  });
});
