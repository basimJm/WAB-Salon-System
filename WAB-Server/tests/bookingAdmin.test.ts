import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createBookingAdminService } from '../src/domain/bookings/bookingAdmin.service';
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
const audits: Record<string, unknown>[] = [];
const changes: { previous: string; to: string; refund: number | undefined }[] = [];
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;
const staffA = new Types.ObjectId();
const adminId = new Types.ObjectId();

const pass: RequestHandler = (req, _res, next) => {
  req.auth = {
    subjectType: 'ADMIN',
    subjectId: adminId.toHexString(),
    scope: 'admin',
    expiresAt: new Date(NOW.getTime() + HOUR),
  } as never;
  next();
};

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  app = createApp({
    logger,
    services: {
      adminGuard: pass,
      bookingQueries: undefined as never,
      bookingAdmin: createBookingAdminService({
        redis,
        bookings: new BookingsRepository(m.bookings.model as never),
        members: new MembersRepository(m.members.model as never),
        audit: createAuditWriter({
          append: (entry: Record<string, unknown>) => {
            audits.push(entry);
            return Promise.resolve(entry);
          },
        } as never),
        settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
        hook: {
          changed: (b, previous, info) => {
            changes.push({ previous, to: b.status, refund: info?.refundDue });
            return Promise.resolve();
          },
        },
        now: () => NOW,
      }),
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
  audits.length = 0;
  changes.length = 0;
  m.members.docs.push({ _id: staffA, staff: { customersCount: 1 } });
});

const seed = (over: Record<string, unknown> = {}, startInHours = 24): string => {
  const _id = new Types.ObjectId();
  const start = new Date(NOW.getTime() + startInHours * HOUR);
  const end = new Date(start.getTime() + HOUR);
  m.bookings.docs.push({
    _id,
    referenceNumber: 'WAB-ABC234',
    customerId: new Types.ObjectId(),
    salonId: new Types.ObjectId(),
    status: 'PENDING',
    statusHistory: [],
    persons: [{ name: 'Rana', staffId: staffA, start, end, services: [] }],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: end,
    paymentMethod: 'DEPOSIT',
    paymentStatus: 'DEPOSIT_PAID',
    policySnapshot: { cancellationWindowHours: 2, noShowDeposit: 'REFUND' },
    money: { total: 10_000, dueOnline: 2_000, paidOnline: 2_000, remaining: 8_000, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
const stored = (id: string): Record<string, unknown> =>
  m.bookings.docs.find((d) => String(d['_id']) === id) ?? {};
interface Body {
  data: { status: string; irregular: boolean };
  error: { code: string };
}
const change = (id: string, body: object): request.Test =>
  request(app).post(`/admin/v1/bookings/${id}/status`).set('Accept-Language', 'en').send(body);

describe('POST /admin/v1/bookings/:id/status', () => {
  it('makes a regular move with a reason, audits it and hands the refund to the hook', async () => {
    const b = seed();
    const res = await change(b, { status: 'REJECTED', reason: 'Salon asked by phone' });
    expect(res.status).toBe(200);
    expect((res.body as Body).data).toMatchObject({ status: 'REJECTED', irregular: false });
    expect(stored(b)['rejection']).toMatchObject({
      by: 'ADMIN',
      reasonText: 'Salon asked by phone',
    });
    expect((stored(b)['statusHistory'] as { actorType: string }[])[0]?.actorType).toBe('ADMIN');
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'BOOKING_STATUS_CHANGE',
        entityId: b,
        before: { status: 'PENDING' },
        after: { status: 'REJECTED', irregular: false },
        reason: 'Salon asked by phone',
        adminId: adminId.toHexString(),
      }),
    ]);
    expect(changes).toEqual([{ previous: 'PENDING', to: 'REJECTED', refund: 2_000 }]);
  });
  it('flags a move nobody could make normally, and does not need the clock', async () => {
    const b = seed({ status: 'COMPLETED' });
    const res = await change(b, { status: 'APPROVED', reason: 'Marked by mistake' });
    expect(res.status).toBe(200);
    expect((res.body as Body).data.irregular).toBe(true);
    expect(audits[0]).toMatchObject({ after: { status: 'APPROVED', irregular: true } });
    const early = seed({ status: 'APPROVED' }, 48);
    expect((await change(early, { status: 'COMPLETED', reason: 'Done early' })).status).toBe(200);
  });
  it('completing marks PAID and counts the customer for the staff member', async () => {
    const b = seed({ status: 'APPROVED' });
    await change(b, { status: 'COMPLETED', reason: 'Confirmed by phone' });
    expect(stored(b)['paymentStatus']).toBe('PAID');
    expect((m.members.docs[0]?.['staff'] as { customersCount: number }).customersCount).toBe(2);
  });
  it('no-show hands the §5.9 refund to the hook', async () => {
    const b = seed({ status: 'APPROVED' });
    await change(b, { status: 'NO_SHOW', reason: 'Salon report' });
    expect(changes[0]?.refund).toBe(2_000);
  });
  it('a reason is mandatory and nothing changes without it', async () => {
    const b = seed();
    expect((await change(b, { status: 'APPROVED' })).status).toBe(400);
    expect((await change(b, { status: 'APPROVED', reason: '   ' })).status).toBe(400);
    expect(stored(b)['status']).toBe('PENDING');
    expect(audits).toHaveLength(0);
  });
  it('same status is already handled; unknown booking is 404; bad status is 400', async () => {
    const b = seed();
    const same = await change(b, { status: 'PENDING', reason: 'x' });
    expect(same.status).toBe(422);
    expect((same.body as Body).error.code).toBe('ALREADY_HANDLED');
    expect(
      (await change(new Types.ObjectId().toHexString(), { status: 'APPROVED', reason: 'x' }))
        .status,
    ).toBe(404);
    expect((await change(b, { status: 'NOPE', reason: 'x' })).status).toBe(400);
  });
  it('putting a booking back on the calendar needs the staff to be free', async () => {
    seed({ status: 'APPROVED' });
    const cancelled = seed({ status: 'CANCELLED_BY_SALON' });
    const res = await change(cancelled, { status: 'APPROVED', reason: 'Salon changed its mind' });
    expect(res.status).toBe(409);
    expect((res.body as Body).error.code).toBe('SLOT_TAKEN');
    expect(stored(cancelled)['status']).toBe('CANCELLED_BY_SALON');
    expect(audits).toHaveLength(0);
  });
});
