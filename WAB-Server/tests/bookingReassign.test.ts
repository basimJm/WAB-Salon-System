import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAvailabilityService } from '../src/domain/availability/availability.service';
import { createHoldsStore } from '../src/domain/availability/holds';
import { createBookingReassignService } from '../src/domain/bookings/bookingReassign.service';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const MIN = 60_000;
const NOW = new Date('2026-10-12T08:00:00Z'); // Monday 11:00 in Amman
const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  services: createFakeModel(),
  closures: createFakeModel(),
  leaves: createFakeModel(),
  bookings: createFakeModel(),
};
const moves: { from: string; to: string }[] = [];
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;

const id = (): Types.ObjectId => new Types.ObjectId();
const salonId = id();
const cut = id();
const color = id();
const staffA = id();
const staffB = id();
const staffC = id();
const week = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
  day,
  isOff: false,
  open: '09:00',
  close: '18:00',
}));
const profile = (serviceIds: Types.ObjectId[]): object => ({
  serviceIds,
  brideQualified: false,
  workingDays: week.map((d) => ({ day: d.day })),
  rating: { avg: 0, count: 0 },
});

const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: id().toHexString(),
    salonId: req.header('x-salon') ?? salonId.toHexString(),
    role: 'MANAGER',
    permissions: (req.header('x-perms') ?? 'BOOKINGS_OPERATE').split(',').filter(Boolean),
  } as never;
  next();
};

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const settings = {
    get: ((key: string) => Promise.resolve(SETTING_DEFAULTS[key as never])) as never,
  };
  const bookings = new BookingsRepository(m.bookings.model as never);
  const availability = createAvailabilityService({
    salons: new SalonsRepository(m.salons.model as never),
    members: new MembersRepository(m.members.model as never),
    salonServices: new SalonServicesRepository(m.services.model as never),
    closures: new ClosuresRepository(m.closures.model as never),
    leaves: new LeavesRepository(m.leaves.model as never),
    bookings,
    holds: createHoldsStore(redis),
    settings,
    now: () => NOW,
  });
  app = createApp({
    logger,
    services: {
      bookingReassign: createBookingReassignService({
        redis,
        bookings,
        availability,
        settings,
        hook: {
          changed: () => Promise.resolve(),
          reassigned: (_b, change) => {
            moves.push(change);
            return Promise.resolve();
          },
        },
        now: () => NOW,
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
  for (const f of Object.values(m)) f.docs.length = 0;
  moves.length = 0;
  m.salons.docs.push({
    _id: salonId,
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    weeklySchedule: week,
  });
  for (const [_id, durationMinutes] of [
    [cut, 30],
    [color, 60],
  ] as const) {
    m.services.docs.push({
      _id,
      salonId,
      active: true,
      durationMinutes,
      brideOnly: false,
      price: 1000,
    });
  }
  m.members.docs.push(
    { _id: staffA, salonId, active: true, providesServices: true, staff: profile([cut, color]) },
    { _id: staffB, salonId, active: true, providesServices: true, staff: profile([cut, color]) },
    { _id: staffC, salonId, active: true, providesServices: true, staff: profile([color]) },
  );
});

/** A booking of `cut` for staff A starting `inMinutes` from NOW. */
const seed = (over: Record<string, unknown> = {}, inMinutes = 30, staff = staffA): string => {
  const _id = id();
  const start = new Date(NOW.getTime() + inMinutes * MIN);
  const end = new Date(start.getTime() + 30 * MIN);
  m.bookings.docs.push({
    _id,
    salonId,
    status: 'APPROVED',
    statusHistory: [],
    persons: [
      {
        name: 'Rana',
        isBride: false,
        staffId: staff,
        staffSelection: 'ANY',
        start,
        end,
        services: [
          { salonServiceId: cut, catalogServiceId: id(), price: 1000, durationMinutes: 30 },
        ],
      },
    ],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: end,
    paymentMethod: 'PAY_ON_ARRIVAL',
    paymentStatus: 'PAY_ON_ARRIVAL',
    policySnapshot: { cancellationWindowHours: 2 },
    money: { total: 1000, dueOnline: 0, paidOnline: 0, remaining: 1000, refunded: 0 },
    referenceNumber: 'WAB-ABC234',
    customerId: id(),
    ...over,
  });
  return _id.toHexString();
};
interface Body {
  data: { status: string };
  error: { code: string };
}
const reassign = (
  bookingId: string,
  staffId: Types.ObjectId | string,
  extra: { perms?: string; salon?: string; personIndex?: number } = {},
): request.Test => {
  const req = request(app)
    .post(`/merchant/v1/bookings/${bookingId}/reassign`)
    .set('Accept-Language', 'en');
  if (extra.perms !== undefined) void req.set('x-perms', extra.perms);
  if (extra.salon !== undefined) void req.set('x-salon', extra.salon);
  return req.send({ personIndex: extra.personIndex ?? 0, staffId: String(staffId) });
};
const personOf = (bookingId: string): { staffId: Types.ObjectId; staffSelection: string } =>
  (
    m.bookings.docs.find((d) => String(d['_id']) === bookingId)?.['persons'] as {
      staffId: Types.ObjectId;
      staffSelection: string;
    }[]
  )[0] as never;

describe('POST /merchant/v1/bookings/:id/reassign', () => {
  it('moves the person to an eligible, free staff member (also close to the start time)', async () => {
    const b = seed();
    const res = await reassign(b, staffB);
    expect(res.status).toBe(200);
    expect(String(personOf(b).staffId)).toBe(staffB.toHexString());
    expect(personOf(b).staffSelection).toBe('SPECIFIC');
    expect(moves).toEqual([{ from: staffA.toHexString(), to: staffB.toHexString() }]);
  });
  it('refuses a staff member without the skills', async () => {
    const b = seed();
    const res = await reassign(b, staffC);
    expect(res.status).toBe(422);
    expect((res.body as Body).error.code).toBe('SLOT_UNAVAILABLE');
    expect(String(personOf(b).staffId)).toBe(staffA.toHexString());
  });
  it('refuses a staff member who is busy, and one who is not in this salon', async () => {
    seed({}, 30, staffB);
    const b = seed({}, 45);
    expect((await reassign(b, staffB)).status).toBe(422);
    const unknown = await reassign(b, id());
    expect((unknown.body as Body).error.code).toBe('STAFF_NOT_ELIGIBLE');
  });
  it('refuses a staff member on leave', async () => {
    m.leaves.docs.push({
      _id: id(),
      salonId,
      memberId: staffB,
      from: '2026-10-12',
      to: '2026-10-12',
    });
    const b = seed();
    expect((await reassign(b, staffB)).status).toBe(422);
  });
  it('only approved bookings that have not started', async () => {
    const pending = seed({ status: 'PENDING' });
    const res = await reassign(pending, staffB);
    expect(res.status).toBe(422);
    expect((res.body as Body).error.code).toBe('INVALID_TRANSITION');
    const started = seed({}, -10);
    expect((await reassign(started, staffB)).status).toBe(422);
  });
  it('rejects the same staff member, an unknown person and other salons’ bookings', async () => {
    const b = seed();
    expect((await reassign(b, staffA)).status).toBe(422);
    expect((await reassign(b, staffB, { personIndex: 3 })).status).toBe(404);
    expect((await reassign(b, staffB, { salon: id().toHexString() })).status).toBe(404);
  });
  it('needs BOOKINGS_OPERATE', async () => {
    const b = seed();
    expect((await reassign(b, staffB, { perms: 'BOOKINGS_RESPOND' })).status).toBe(403);
    expect(String(personOf(b).staffId)).toBe(staffA.toHexString());
  });
  it('validates the body', async () => {
    const b = seed();
    expect((await reassign(b, 'nope')).status).toBe(400);
  });
});
