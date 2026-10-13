import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import { createAccessEvents } from '../src/sockets/accessEvents';
import { createBookingEvents, type SocketRelay } from '../src/sockets/bookingEvents';
import { createRoomsFor } from '../src/sockets/rooms';
import { createSocketServer, type SocketHub } from '../src/sockets/socketServer';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import type { BookingRaw } from '../src/models/booking.model';
import type { Entity } from '../src/utils/database/plain';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

jest.setTimeout(20_000);
const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const m = { members: createFakeModel(), customers: createFakeModel() };
const relay: SocketRelay = {};
let testRedis: TestRedis;
let redis: Redis;
let http: Server;
let hub: SocketHub;
let url: string;
const clients: ClientSocket[] = [];
const salon = new Types.ObjectId();
const memberId = new Types.ObjectId();
const customerId = new Types.ObjectId();

const members = new MembersRepository(m.members.model as never);
const access = createAccessEvents({ relay, members, logger });
const bookings = createBookingEvents({
  relay,
  customers: new CustomersRepository(m.customers.model as never),
  members,
  logger,
});

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  http = createServer();
  await new Promise<void>((resolve) => http.listen(0, resolve));
  hub = createSocketServer({
    httpServer: http,
    redis,
    accessSecret: SECRET,
    corsAllowedOrigins: [],
    logger,
    roomsFor: createRoomsFor(members),
  });
  relay.current = hub;
  url = `http://127.0.0.1:${String((http.address() as AddressInfo).port)}`;
});
afterAll(async () => {
  for (const c of clients) c.close();
  await hub.close();
  await new Promise((resolve) => http.close(resolve));
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(() => {
  m.members.docs.length = 0;
  m.members.docs.push({
    _id: memberId,
    salonId: salon,
    role: 'MANAGER',
    permissions: ['BOOKINGS_RESPOND'],
    active: true,
  });
  m.customers.docs.push({ _id: customerId, firstName: 'R', lastName: 'A' });
});

const open = async (
  namespace: string,
  subjectType: 'CUSTOMER' | 'MEMBER',
  subjectId: Types.ObjectId,
): Promise<{ client: ClientSocket; got: Record<string, unknown[]>; closed: Promise<void> }> => {
  const client = connect(`${url}${namespace}`, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    auth: {
      token: signAccessToken({
        secret: SECRET,
        subjectType,
        subjectId: subjectId.toHexString(),
        ttlSec: 600,
      }).token,
    },
  });
  clients.push(client);
  const got: Record<string, unknown[]> = {};
  client.onAny((event: string, payload: unknown) => {
    (got[event] ??= []).push(payload);
  });
  const closed = new Promise<void>((resolve) =>
    client.once('disconnect', () => {
      resolve();
    }),
  );
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return { client, got, closed };
};
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));
const request = (): Entity<BookingRaw> =>
  ({
    id: new Types.ObjectId().toHexString(),
    referenceNumber: 'WAB-ABC234',
    customerId: customerId.toHexString(),
    salonId: salon.toHexString(),
    status: 'PENDING',
    paymentStatus: 'PAY_ON_ARRIVAL',
    hasBride: false,
    appointmentStart: new Date('2026-10-13T09:00:00Z'),
    appointmentEnd: new Date('2026-10-13T10:00:00Z'),
    respondBy: new Date('2026-10-13T10:00:00Z'),
    money: { total: 1000, dueOnline: 0, paidOnline: 0, remaining: 1000, refunded: 0 },
    persons: [],
  }) as unknown as Entity<BookingRaw>;

describe('permissions.updated', () => {
  it('moves the live socket between salon rooms without reconnecting', async () => {
    const { got } = await open('/merchant', 'MEMBER', memberId);
    await bookings.created(request());
    await settle();
    expect(got['booking.requested']).toHaveLength(1);

    // The owner takes BOOKINGS_RESPOND away and gives VIEW_ALL.
    m.members.docs[0] = { ...m.members.docs[0], permissions: ['BOOKINGS_VIEW_ALL'] };
    await access.permissionsChanged(memberId.toHexString());
    await settle();
    expect(got['permissions.updated']).toHaveLength(1);
    await bookings.created(request());
    await settle();
    expect(got['booking.requested']).toHaveLength(1); // no new request
    expect(got['booking.updated']).toHaveLength(1); // salon-all room now

    // ... and gives RESPOND back.
    m.members.docs[0] = { ...m.members.docs[0], permissions: ['BOOKINGS_RESPOND'] };
    await access.permissionsChanged(memberId.toHexString());
    await settle();
    await bookings.created(request());
    await settle();
    expect(got['booking.requested']).toHaveLength(2);
    expect(got['booking.updated']).toHaveLength(1);
  });
  it('a member who is no longer active is told and disconnected', async () => {
    const { got, closed } = await open('/merchant', 'MEMBER', memberId);
    m.members.docs[0] = { ...m.members.docs[0], active: false };
    await access.permissionsChanged(memberId.toHexString());
    await closed;
    expect(got['access.revoked']).toHaveLength(1);
  });
});

describe('access.revoked', () => {
  it('tells the account and hangs up, only that account', async () => {
    const mine = await open('/merchant', 'MEMBER', memberId);
    const otherId = new Types.ObjectId();
    m.members.docs.push({
      _id: otherId,
      salonId: salon,
      role: 'MANAGER',
      permissions: [],
      active: true,
    });
    const other = await open('/merchant', 'MEMBER', otherId);
    await access.accessRevoked({ scope: 'merchant', id: memberId.toHexString() });
    await mine.closed;
    expect(mine.got['access.revoked']).toHaveLength(1);
    await settle();
    expect(other.client.connected).toBe(true);
    expect(other.got['access.revoked']).toBeUndefined();
  });
  it('works for customers', async () => {
    const customer = await open('/customer', 'CUSTOMER', customerId);
    await access.accessRevoked({ scope: 'customer', id: customerId.toHexString() });
    await customer.closed;
    expect(customer.got['access.revoked']).toHaveLength(1);
  });
});

describe('notifications.unread', () => {
  it('sends the counter to the account only', async () => {
    const mine = await open('/customer', 'CUSTOMER', customerId);
    const other = await open('/customer', 'CUSTOMER', new Types.ObjectId());
    await access.unreadChanged({ scope: 'customer', id: customerId.toHexString() }, 3);
    await settle();
    expect(mine.got['notifications.unread']).toEqual([{ count: 3 }]);
    expect(other.got['notifications.unread']).toBeUndefined();
  });
});

describe('failures', () => {
  it('never throw into the caller and do nothing before the hub exists', async () => {
    const early = createAccessEvents({ relay: {}, members, logger });
    await expect(early.permissionsChanged(memberId.toHexString())).resolves.toBeUndefined();
    await expect(early.accessRevoked({ scope: 'customer', id: 'x' })).resolves.toBeUndefined();
    await expect(early.unreadChanged({ scope: 'customer', id: 'x' }, 1)).resolves.toBeUndefined();
    const broken = createAccessEvents({
      relay,
      members: { findById: () => Promise.reject(new Error('db down')) },
      logger,
    });
    await expect(broken.permissionsChanged(memberId.toHexString())).resolves.toBeUndefined();
  });
});
