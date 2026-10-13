import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import type { BookingRaw } from '../src/models/booking.model';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { createBookingEvents, type SocketRelay } from '../src/sockets/bookingEvents';
import { createRoomsFor } from '../src/sockets/rooms';
import { createSocketServer, type SocketHub } from '../src/sockets/socketServer';
import { signAccessToken } from '../src/utils/auth/accessToken';
import type { Entity } from '../src/utils/database/plain';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

jest.setTimeout(20_000);
const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const id = (): string => new Types.ObjectId().toHexString();
const m = { members: createFakeModel(), customers: createFakeModel() };
const relay: SocketRelay = {};
let testRedis: TestRedis;
let redis: Redis;
let http: Server;
let hub: SocketHub;
let url: string;
const clients: ClientSocket[] = [];

const salon = id();
const otherSalon = id();
const customerA = id();
const customerB = id();
const staffOwn = id(); // VIEW_OWN, assigned
const staffOther = id(); // VIEW_OWN, not assigned
const responder = id(); // RESPOND only
const viewer = id(); // VIEW_ALL only
const noView = id(); // assigned but may not see bookings
const stranger = id(); // other salon, everything
const inactive = id();

const addMember = (_id: string, salonId: string, permissions: string[], active = true): void => {
  m.members.docs.push({
    _id: new Types.ObjectId(_id),
    salonId: new Types.ObjectId(salonId),
    role: 'MANAGER',
    permissions,
    active,
    firstName: 'M',
    lastName: _id.slice(-3),
  });
};

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  addMember(staffOwn, salon, ['BOOKINGS_VIEW_OWN']);
  addMember(staffOther, salon, ['BOOKINGS_VIEW_OWN']);
  addMember(responder, salon, ['BOOKINGS_RESPOND']);
  addMember(viewer, salon, ['BOOKINGS_VIEW_ALL']);
  addMember(noView, salon, ['REVIEWS_VIEW']);
  addMember(stranger, otherSalon, ['BOOKINGS_VIEW_ALL', 'BOOKINGS_RESPOND']);
  addMember(inactive, salon, ['BOOKINGS_VIEW_ALL'], false);
  m.customers.docs.push({
    _id: new Types.ObjectId(customerA),
    firstName: 'Rana',
    lastName: 'Ahmad',
  });
  http = createServer();
  await new Promise<void>((resolve) => http.listen(0, resolve));
  hub = createSocketServer({
    httpServer: http,
    redis,
    accessSecret: SECRET,
    corsAllowedOrigins: [],
    logger,
    roomsFor: createRoomsFor(new MembersRepository(m.members.model as never)),
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

const events = createBookingEvents({
  relay,
  customers: new CustomersRepository(m.customers.model as never),
  members: new MembersRepository(m.members.model as never),
  logger,
});

const open = async (
  namespace: string,
  subjectType: 'CUSTOMER' | 'MEMBER' | 'ADMIN',
  subjectId: string,
): Promise<{ client: ClientSocket; got: Record<string, unknown[]> }> => {
  const token = signAccessToken({ secret: SECRET, subjectType, subjectId, ttlSec: 600 }).token;
  const client = connect(`${url}${namespace}`, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    auth: { token },
  });
  clients.push(client);
  const got: Record<string, unknown[]> = {};
  client.onAny((event: string, payload: unknown) => {
    (got[event] ??= []).push(payload);
  });
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return { client, got };
};
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

const booking = (over: Partial<Record<string, unknown>> = {}): Entity<BookingRaw> => {
  const start = new Date('2026-10-13T09:00:00Z');
  return {
    id: id(),
    referenceNumber: 'WAB-ABC234',
    customerId: customerA,
    salonId: salon,
    status: 'PENDING',
    paymentStatus: 'PAY_ON_ARRIVAL',
    hasBride: true,
    appointmentStart: start,
    appointmentEnd: new Date(start.getTime() + 3_600_000),
    respondBy: new Date(start.getTime() + 3_600_000),
    money: { total: 12_500, dueOnline: 0, paidOnline: 0, remaining: 12_500, refunded: 0 },
    persons: [
      {
        staffId: staffOwn,
        services: [
          { salonServiceId: 's1', name: { ar: 'قص', en: 'Cut' } },
          { salonServiceId: 's1', name: { ar: 'قص', en: 'Cut' } },
        ],
      },
    ],
    ...over,
  } as unknown as Entity<BookingRaw>;
};

describe('booking events', () => {
  it('a new request reaches only members who may respond; everyone allowed gets the update', async () => {
    const [resp, view, own, other, none, foreign, cust, otherCust, admin] = await Promise.all([
      open('/merchant', 'MEMBER', responder),
      open('/merchant', 'MEMBER', viewer),
      open('/merchant', 'MEMBER', staffOwn),
      open('/merchant', 'MEMBER', staffOther),
      open('/merchant', 'MEMBER', noView),
      open('/merchant', 'MEMBER', stranger),
      open('/customer', 'CUSTOMER', customerA),
      open('/customer', 'CUSTOMER', customerB),
      open('/admin', 'ADMIN', id()),
    ]);
    const b = booking();
    await events.created(b);
    await settle();

    expect(resp.got['booking.requested']).toHaveLength(1);
    expect(resp.got['booking.requested']?.[0]).toMatchObject({
      id: b.id,
      customerName: 'Rana Ahmad',
      services: [{ ar: 'قص', en: 'Cut' }],
      total: '12.500',
      hasBride: true,
    });
    // Never the request for anyone without BOOKINGS_RESPOND, nor for another salon.
    for (const who of [view, own, other, none, foreign, cust, otherCust, admin]) {
      expect(who.got['booking.requested']).toBeUndefined();
    }
    // Updates: VIEW_ALL, the assigned staff (VIEW_OWN), the customer and the admin.
    for (const who of [view, own, cust, admin]) {
      expect(who.got['booking.updated']).toHaveLength(1);
    }
    for (const who of [resp, other, none, foreign, otherCust]) {
      expect(who.got['booking.updated']).toBeUndefined();
    }
  });
  it('status changes reach the same audience', async () => {
    const view = await open('/merchant', 'MEMBER', viewer);
    const own = await open('/merchant', 'MEMBER', staffOwn);
    const none = await open('/merchant', 'MEMBER', noView);
    await events.changed(booking({ status: 'APPROVED' }), 'PENDING');
    await settle();
    expect(view.got['booking.updated']?.[0]).toMatchObject({ status: 'APPROVED' });
    expect(own.got['booking.updated']).toHaveLength(1);
    expect(none.got['booking.updated']).toBeUndefined();
  });
  it('reassignment: the new staff member is told it is assigned, the old one gets the update', async () => {
    const oldStaff = await open('/merchant', 'MEMBER', staffOther);
    const newStaff = await open('/merchant', 'MEMBER', staffOwn);
    const b = booking({
      status: 'APPROVED',
      persons: [{ staffId: staffOwn, services: [] }],
    });
    await events.reassigned(b, { from: staffOther, to: staffOwn });
    await settle();
    expect(newStaff.got['booking.assigned']).toHaveLength(1);
    expect(oldStaff.got['booking.updated']).toHaveLength(1);
    expect(oldStaff.got['booking.assigned']).toBeUndefined();
  });
  it('a deactivated member cannot connect', async () => {
    await expect(open('/merchant', 'MEMBER', inactive)).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
    await expect(open('/merchant', 'MEMBER', id())).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
  });
  it('a failing member lookup during the handshake is UNAVAILABLE, not an auth failure', async () => {
    const broken = createServer();
    await new Promise<void>((resolve) => broken.listen(0, resolve));
    const brokenHub = createSocketServer({
      httpServer: broken,
      redis,
      accessSecret: SECRET,
      corsAllowedOrigins: [],
      logger,
      roomsFor: () => Promise.reject(new Error('db down')),
    });
    const token = signAccessToken({
      secret: SECRET,
      subjectType: 'MEMBER',
      subjectId: id(),
      ttlSec: 60,
    }).token;
    const client = connect(
      `http://127.0.0.1:${String((broken.address() as AddressInfo).port)}/merchant`,
      {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        auth: { token },
      },
    );
    const code = await new Promise<string>((resolve) => {
      client.once('connect_error', (error) => {
        resolve((error as unknown as { data: { code: string } }).data.code);
      });
    });
    expect(code).toBe('UNAVAILABLE');
    client.close();
    await brokenHub.close();
    await new Promise((resolve) => broken.close(resolve));
  });
  it('a failing emit is logged and never thrown into the booking flow', async () => {
    const broken: SocketRelay = {
      current: {
        emit: () => {
          throw new Error('redis down');
        },
        disconnect: () => undefined,
        close: () => Promise.resolve(),
      },
    };
    const safe = createBookingEvents({
      relay: broken,
      customers: new CustomersRepository(m.customers.model as never),
      members: new MembersRepository(m.members.model as never),
      logger,
    });
    await expect(safe.created(booking())).resolves.toBeUndefined();
    await expect(safe.changed(booking(), 'PENDING')).resolves.toBeUndefined();
  });
  it('does nothing before the hub exists', async () => {
    const early = createBookingEvents({
      relay: {},
      customers: new CustomersRepository(m.customers.model as never),
      members: new MembersRepository(m.members.model as never),
      logger,
    });
    await expect(early.created(booking())).resolves.toBeUndefined();
  });
});
