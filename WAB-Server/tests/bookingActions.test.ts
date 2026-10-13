import type { Redis } from 'ioredis';
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createBookingActionsService } from '../src/domain/bookings/bookingActions.service';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const HOUR = 3_600_000;
let clock = new Date('2026-10-12T08:00:00Z');
const m = { bookings: createFakeModel(), members: createFakeModel() };
const changes: string[] = [];
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;

const salonId = new Types.ObjectId();
const staffId = new Types.ObjectId();
const memberId = new Types.ObjectId();

/** The signed-in member comes from headers; the real guard is covered by the permission tests. */
const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: memberId.toHexString(),
    salonId: req.header('x-salon') ?? salonId.toHexString(),
    role: 'MANAGER',
    permissions: (req.header('x-perms') ?? '').split(',').filter(Boolean),
  } as never;
  next();
};

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const settings = {
    get: ((key: string) => Promise.resolve(SETTING_DEFAULTS[key as never])) as never,
  };
  app = createApp({
    logger,
    services: {
      bookingActions: createBookingActionsService({
        redis,
        bookings: new BookingsRepository(m.bookings.model as never),
        members: new MembersRepository(m.members.model as never),
        settings,
        hook: {
          changed: (booking, previous) => {
            changes.push(`${previous}>${booking.status}`);
            return Promise.resolve();
          },
        },
        now: () => clock,
      }),
      salonProfile: { service: undefined as never, guard: [guard] },
    },
  });
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(() => {
  m.bookings.docs.length = 0;
  m.members.docs.length = 0;
  changes.length = 0;
  clock = new Date('2026-10-12T08:00:00Z');
  m.members.docs.push({
    _id: staffId,
    salonId,
    staff: { customersCount: 4, providesServices: true },
  });
});

const seed = (
  over: Record<string, unknown> = {},
  staff: Types.ObjectId = staffId,
  start = new Date(clock.getTime() + 24 * HOUR),
): string => {
  const _id = new Types.ObjectId();
  const end = new Date(start.getTime() + HOUR);
  m.bookings.docs.push({
    _id,
    referenceNumber: 'WAB-ABC234',
    customerId: new Types.ObjectId(),
    salonId,
    status: 'PENDING',
    statusHistory: [{ status: 'PENDING', actorType: 'CUSTOMER', at: clock }],
    persons: [{ staffId: staff, start, end, services: [] }],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: new Date(start.getTime() + HOUR),
    paymentMethod: 'PAY_ON_ARRIVAL',
    paymentStatus: 'PAY_ON_ARRIVAL',
    policySnapshot: { cancellationWindowHours: 2 },
    money: { total: 10_000, dueOnline: 0, paidOnline: 0, remaining: 10_000, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
const stored = (bookingId: string): Record<string, unknown> =>
  m.bookings.docs.find((d) => String(d['_id']) === bookingId) ?? {};
interface Body {
  data: { status: string; paymentStatus: string };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const post = (path: string, perms: string, body?: object, salon?: string): request.Test => {
  const req = request(app)
    .post(`/merchant/v1/bookings/${path}`)
    .set('x-perms', perms)
    .set('Accept-Language', 'en');
  if (salon !== undefined) void req.set('x-salon', salon);
  return body === undefined ? req : req.send(body);
};

describe('approve', () => {
  it('approves a pending booking, appends history and calls the hook', async () => {
    const b = seed();
    const res = await post(`${b}/approve`, 'BOOKINGS_RESPOND');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.status).toBe('APPROVED');
    const doc = stored(b);
    expect(doc['status']).toBe('APPROVED');
    expect((doc['statusHistory'] as unknown[]).length).toBe(2);
    expect(changes).toEqual(['PENDING>APPROVED']);
  });
  it('needs BOOKINGS_RESPOND', async () => {
    const b = seed();
    const res = await post(`${b}/approve`, 'BOOKINGS_OPERATE');
    expect(res.status).toBe(403);
    expect(stored(b)['status']).toBe('PENDING');
  });
  it('answers 409 SLOT_TAKEN when the staff member is no longer free', async () => {
    const start = new Date(clock.getTime() + 24 * HOUR);
    seed({ status: 'APPROVED' }, staffId, start);
    const b = seed({}, staffId, new Date(start.getTime() + HOUR / 2));
    const res = await post(`${b}/approve`, 'BOOKINGS_RESPOND');
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SLOT_TAKEN');
    expect(stored(b)['status']).toBe('PENDING');
  });
  it('does not conflict with its own pending slot or back-to-back bookings', async () => {
    const start = new Date(clock.getTime() + 24 * HOUR);
    seed({ status: 'APPROVED' }, staffId, new Date(start.getTime() - HOUR));
    const b = seed({}, staffId, start);
    expect((await post(`${b}/approve`, 'BOOKINGS_RESPOND')).status).toBe(200);
  });
  it('a second approve is rejected as already handled', async () => {
    const b = seed();
    await post(`${b}/approve`, 'BOOKINGS_RESPOND');
    const res = await post(`${b}/approve`, 'BOOKINGS_RESPOND');
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('ALREADY_HANDLED');
  });
  it('treats another salon’s booking as unknown', async () => {
    const b = seed();
    const res = await post(
      `${b}/approve`,
      'BOOKINGS_RESPOND',
      undefined,
      new Types.ObjectId().toHexString(),
    );
    expect(res.status).toBe(404);
  });
});

describe('reject and salon cancel', () => {
  it('rejects with a reason code and stores the decision', async () => {
    const b = seed();
    const res = await post(`${b}/reject`, 'BOOKINGS_RESPOND', {
      reasonCode: 'FULLY_BOOKED',
      reasonText: 'No capacity',
    });
    expect(res.status).toBe(200);
    const doc = stored(b);
    expect(doc['status']).toBe('REJECTED');
    expect(doc['rejection']).toMatchObject({ reasonCode: 'FULLY_BOOKED', by: 'MEMBER' });
  });
  it('requires a valid reason code', async () => {
    const b = seed();
    expect((await post(`${b}/reject`, 'BOOKINGS_RESPOND', {})).status).toBe(400);
    expect((await post(`${b}/reject`, 'BOOKINGS_RESPOND', { reasonCode: 'bad code' })).status).toBe(
      400,
    );
  });
  it('cancels an approved booking before its start', async () => {
    const b = seed({ status: 'APPROVED' });
    const res = await post(`${b}/cancel`, 'BOOKINGS_OPERATE', { reasonCode: 'STAFF_ILL' });
    expect(res.status).toBe(200);
    expect(stored(b)['status']).toBe('CANCELLED_BY_SALON');
    expect(stored(b)['cancellation']).toMatchObject({ reasonCode: 'STAFF_ILL' });
  });
  it('cannot cancel once the appointment started, or a pending booking', async () => {
    const started = seed({ status: 'APPROVED' }, staffId, new Date(clock.getTime() - HOUR));
    expect((await post(`${started}/cancel`, 'BOOKINGS_OPERATE', { reasonCode: 'X1' })).status).toBe(
      422,
    );
    const pending = seed();
    const res = await post(`${pending}/cancel`, 'BOOKINGS_OPERATE', { reasonCode: 'X1' });
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('INVALID_TRANSITION');
  });
});

describe('complete and no-show', () => {
  const past = (): Date => new Date(clock.getTime() - HOUR);
  it('completes after the start, marks PAID and counts the customer for the staff member', async () => {
    const b = seed({ status: 'APPROVED' }, staffId, past());
    const res = await post(`${b}/complete`, 'BOOKINGS_OPERATE');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({ status: 'COMPLETED', paymentStatus: 'PAID' });
    expect(stored(b)['completedAt']).toEqual(clock);
    const staff = m.members.docs[0]?.['staff'] as { customersCount: number };
    expect(staff.customersCount).toBe(5);
  });
  it('is refused before the start time', async () => {
    const b = seed({ status: 'APPROVED' });
    expect((await post(`${b}/complete`, 'BOOKINGS_OPERATE')).status).toBe(422);
    expect((await post(`${b}/no-show`, 'BOOKINGS_OPERATE')).status).toBe(422);
    expect(stored(b)['status']).toBe('APPROVED');
  });
  it('marks a no-show after the start without counting a customer', async () => {
    const b = seed({ status: 'APPROVED' }, staffId, past());
    const res = await post(`${b}/no-show`, 'BOOKINGS_OPERATE');
    expect(res.status).toBe(200);
    expect(stored(b)['status']).toBe('NO_SHOW');
    expect(stored(b)['noShowAt']).toEqual(clock);
    expect((m.members.docs[0]?.['staff'] as { customersCount: number }).customersCount).toBe(4);
  });
  it('needs BOOKINGS_OPERATE', async () => {
    const b = seed({ status: 'APPROVED' }, staffId, past());
    expect((await post(`${b}/complete`, 'BOOKINGS_RESPOND')).status).toBe(403);
  });
  it('rejects a malformed booking id', async () => {
    expect((await post('nope/complete', 'BOOKINGS_OPERATE')).status).toBe(400);
  });
});
