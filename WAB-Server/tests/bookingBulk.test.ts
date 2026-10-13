import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createBookingActionsService } from '../src/domain/bookings/bookingActions.service';
import { createBookingBulkService } from '../src/domain/bookings/bookingBulk.service';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const HOUR = 3_600_000;
const NOW = new Date('2026-10-12T08:00:00Z');
const m = { bookings: createFakeModel(), members: createFakeModel() };
const refunds: (number | undefined)[] = [];
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;
const salonId = new Types.ObjectId();
const staffA = new Types.ObjectId();

const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: new Types.ObjectId().toHexString(),
    salonId: req.header('x-salon') ?? salonId.toHexString(),
    role: 'MANAGER',
    permissions: (req.header('x-perms') ?? 'BOOKINGS_RESPOND,BOOKINGS_OPERATE')
      .split(',')
      .filter(Boolean),
  } as never;
  next();
};

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const bookings = new BookingsRepository(m.bookings.model as never);
  const actions = createBookingActionsService({
    redis,
    bookings,
    members: new MembersRepository(m.members.model as never),
    settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
    hook: {
      changed: (_b, _p, info) => {
        refunds.push(info?.refundDue);
        return Promise.resolve();
      },
    },
    now: () => NOW,
  });
  app = createApp({
    logger,
    services: {
      bookingBulk: createBookingBulkService({ bookings, actions }),
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
  refunds.length = 0;
});

const seed = (over: Record<string, unknown> = {}, startInHours = 24): string => {
  const _id = new Types.ObjectId();
  const start = new Date(NOW.getTime() + startInHours * HOUR);
  const end = new Date(start.getTime() + HOUR);
  m.bookings.docs.push({
    _id,
    referenceNumber: 'WAB-ABC234',
    customerId: new Types.ObjectId(),
    salonId,
    status: 'PENDING',
    statusHistory: [],
    persons: [{ name: 'Rana', staffId: staffA, start, end, services: [] }],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: end,
    paymentMethod: 'DEPOSIT',
    paymentStatus: 'DEPOSIT_PAID',
    policySnapshot: { cancellationWindowHours: 2 },
    money: { total: 10_000, dueOnline: 2_000, paidOnline: 2_000, remaining: 8_000, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
const status = (id: string): unknown =>
  m.bookings.docs.find((d) => String(d['_id']) === id)?.['status'];
interface Body {
  data: { bookingId: string; outcome: string; status?: string; code?: string }[];
}
const cancel = (bookingIds: string[], perms?: string, extra: object = {}): request.Test => {
  const req = request(app)
    .post('/merchant/v1/bookings/cancel-affected')
    .set('Accept-Language', 'en');
  if (perms !== undefined) void req.set('x-perms', perms);
  return req.send({
    bookingIds,
    reasonCode: 'SCHEDULE_CHANGE',
    reasonText: 'Closed for renovation',
    ...extra,
  });
};

describe('POST /merchant/v1/bookings/cancel-affected', () => {
  it('rejects pending and cancels approved bookings, with full refunds to the hook', async () => {
    const pending = seed();
    const approved = seed({ status: 'APPROVED' }, 30);
    const res = await cancel([pending, approved]);
    expect(res.status).toBe(200);
    expect((res.body as Body).data).toEqual([
      { bookingId: pending, outcome: 'DONE', status: 'REJECTED' },
      { bookingId: approved, outcome: 'DONE', status: 'CANCELLED_BY_SALON' },
    ]);
    expect(status(pending)).toBe('REJECTED');
    expect(status(approved)).toBe('CANCELLED_BY_SALON');
    expect(refunds).toEqual([2_000, 2_000]);
  });
  it('reports failures per booking without stopping the rest', async () => {
    const ok = seed();
    const started = seed({ status: 'APPROVED' }, -2);
    const done = seed({ status: 'COMPLETED' });
    const foreign = seed({ salonId: new Types.ObjectId() });
    const res = await cancel([started, foreign, done, ok, ok]);
    const data = (res.body as Body).data;
    expect(data).toHaveLength(4);
    expect(data.find((r) => r.bookingId === started)).toMatchObject({
      outcome: 'FAILED',
      code: 'INVALID_TRANSITION',
    });
    expect(data.find((r) => r.bookingId === foreign)).toMatchObject({
      outcome: 'FAILED',
      code: 'NOT_FOUND',
    });
    expect(data.find((r) => r.bookingId === done)).toMatchObject({ outcome: 'FAILED' });
    expect(data.find((r) => r.bookingId === ok)).toMatchObject({ outcome: 'DONE' });
    expect(status(ok)).toBe('REJECTED');
    expect(status(started)).toBe('APPROVED');
  });
  it('a member with only one of the permissions can handle only that kind', async () => {
    const pending = seed();
    const approved = seed({ status: 'APPROVED' }, 30);
    const res = await cancel([pending, approved], 'BOOKINGS_RESPOND');
    const data = (res.body as Body).data;
    expect(data[0]).toMatchObject({ outcome: 'DONE' });
    expect(data[1]).toMatchObject({ outcome: 'FAILED', code: 'PERMISSION_DENIED' });
    expect(status(approved)).toBe('APPROVED');
  });
  it('needs a booking permission', async () => {
    const id = seed();
    expect((await cancel([id], 'BOOKINGS_VIEW_ALL')).status).toBe(403);
    expect(status(id)).toBe('PENDING');
  });
  it('validates the body', async () => {
    expect((await cancel([])).status).toBe(400);
    expect((await cancel(['nope'])).status).toBe(400);
    expect((await cancel([seed()], undefined, { reasonCode: 'bad code' })).status).toBe(400);
    expect((await cancel(Array.from({ length: 101 }, () => seed()))).status).toBe(400);
  });
});
