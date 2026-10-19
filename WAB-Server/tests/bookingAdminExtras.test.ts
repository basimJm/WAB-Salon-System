import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ADMIN_CANCEL_MODES } from '../src/constants/bookings';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createBookingAdminService } from '../src/domain/bookings/bookingAdmin.service';
import { createBookingAdminExtrasService } from '../src/domain/bookings/bookingAdminExtras.service';
import { createBookingReassignService } from '../src/domain/bookings/bookingReassign.service';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { ConflictError, BusinessRuleError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const HOUR = 3_600_000;
const NOW = new Date('2026-10-12T08:00:00Z');
const REASON = 'Customer called support';
const m = { bookings: createFakeModel(), members: createFakeModel() };
const audits: Record<string, unknown>[] = [];
const changes: { previous: string; to: string; refund: number | undefined }[] = [];
const refundCalls: Record<string, unknown>[] = [];
const reassignCalls: Record<string, unknown>[] = [];
const salonId = new Types.ObjectId();
const staffA = new Types.ObjectId();
const staffB = new Types.ObjectId();
const staffC = new Types.ObjectId();
const adminId = new Types.ObjectId();
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;
/** Staff ids the availability rules refuse (skills, hours, leave...). */
const ineligible = new Set<string>();
const busy = new Set<string>();
let reassignedTo: string | undefined;

const pass: RequestHandler = (req, _res, next) => {
  req.auth = {
    subjectType: 'ADMIN',
    subjectId: adminId.toHexString(),
    scope: 'admin',
    expiresAt: new Date(NOW.getTime() + HOUR),
  } as never;
  next();
};
const audit = createAuditWriter({
  append: (entry: Record<string, unknown>) => {
    audits.push(entry);
    return Promise.resolve(entry);
  },
} as never);
const settings = { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) };

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const bookings = new BookingsRepository(m.bookings.model as never);
  const admin = createBookingAdminService({
    redis,
    bookings,
    members: new MembersRepository(m.members.model as never),
    audit,
    settings,
    hook: {
      changed: (b, previous, info) => {
        changes.push({ previous, to: b.status, refund: info?.refundDue });
        return Promise.resolve();
      },
    },
    now: () => NOW,
  });
  const reassign = createBookingReassignService({
    redis,
    bookings: {
      findById: (id: string) => bookings.findById(id),
      overlapping: (staffId: string) => Promise.resolve(busy.has(staffId)),
      reassign: ({ id, to }: { id: string; to: string }) => {
        reassignedTo = to;
        return bookings.findById(id);
      },
    } as never,
    availability: {
      plan: ({ persons }: { persons: readonly { staffId?: string | undefined }[] }) => {
        if (ineligible.has(String(persons[0]?.staffId))) {
          return Promise.reject(new BusinessRuleError({ code: ERROR_CODES.STAFF_NOT_ELIGIBLE }));
        }
        return Promise.resolve({} as never);
      },
    },
    members: new MembersRepository(m.members.model as never),
    settings,
    hook: {
      changed: () => Promise.resolve(),
      reassigned: (_b, info) => {
        reassignCalls.push(info);
        return Promise.resolve();
      },
    },
    now: () => NOW,
  });
  app = createApp({
    logger,
    services: {
      adminGuard: pass,
      bookingAdminExtras: createBookingAdminExtrasService({
        reassign,
        admin,
        refunds: {
          refundBookingAmount: (input) => {
            refundCalls.push(input);
            return Promise.resolve({ id: 'r1', amount: input.amount, status: 'REFUNDED' } as never);
          },
        },
        audit,
      }),
    },
  });
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  changes.length = 0;
  refundCalls.length = 0;
  reassignCalls.length = 0;
  ineligible.clear();
  busy.clear();
  reassignedTo = undefined;
  for (const [id, name] of [
    [staffA, 'Rana'],
    [staffB, 'Dina'],
    [staffC, 'Hala'],
  ] as const) {
    m.members.docs.push({
      _id: id,
      salonId,
      firstName: name,
      lastName: 'S',
      active: true,
      providesServices: true,
      staff: { customersCount: 0 },
    });
  }
  m.members.docs.push({
    _id: new Types.ObjectId(),
    salonId,
    firstName: 'Off',
    lastName: 'S',
    active: false,
    providesServices: true,
  });
  m.members.docs.push({
    _id: new Types.ObjectId(),
    salonId,
    firstName: 'Desk',
    lastName: 'S',
    active: true,
    providesServices: false,
  });
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
    status: 'APPROVED',
    statusHistory: [],
    persons: [
      {
        name: 'Rana',
        isBride: false,
        staffId: staffA,
        start,
        end,
        services: [{ salonServiceId: new Types.ObjectId() }],
      },
    ],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: end,
    paymentMethod: 'FULL_ONLINE',
    paymentStatus: 'PAID',
    policySnapshot: {
      cancellationWindowHours: 2,
      depositRefundableOnCustomerCancel: true,
      fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT',
      depositPercentage: 20,
      noShowDeposit: 'KEEP',
      noShowFullPayment: 'KEEP',
    },
    money: { total: 10_000, dueOnline: 10_000, paidOnline: 10_000, remaining: 0, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
const stored = (id: string): Record<string, unknown> =>
  m.bookings.docs.find((d) => String(d['_id']) === id) ?? {};
interface Body {
  data: Record<string, unknown> & { staffId?: string }[];
  error?: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const post = (id: string, path: string, body: object): request.Test =>
  request(app).post(`/admin/v1/bookings/${id}/${path}`).send(body);

describe('admin booking cancel modes', () => {
  it('has the three documented modes', () => {
    expect([...ADMIN_CANCEL_MODES]).toEqual(['CUSTOMER', 'SALON', 'ADMIN']);
  });

  it('SALON and ADMIN end as a salon-side cancellation with everything paid refunded', async () => {
    for (const mode of ['SALON', 'ADMIN']) {
      changes.length = 0;
      audits.length = 0;
      const id = seed();
      const res = await post(id, 'cancel', { mode, reason: REASON });
      expect(res.status).toBe(200);
      expect(bodyOf(res).data['status']).toBe('CANCELLED_BY_SALON');
      expect(changes).toEqual([{ previous: 'APPROVED', to: 'CANCELLED_BY_SALON', refund: 10_000 }]);
      expect(audits[0]).toMatchObject({ action: 'BOOKING_ADMIN_CANCEL', reason: REASON });
      expect(stored(id)['cancellation']).toMatchObject({ by: 'ADMIN', reasonText: REASON });
    }
  });

  it('CUSTOMER follows the snapshotted policy: full payment minus the deposit kept', async () => {
    const id = seed();
    const res = await post(id, 'cancel', { mode: 'CUSTOMER', reason: REASON });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['status']).toBe('CANCELLED_BY_CUSTOMER');
    // total 10 JOD, deposit 20% = 2 JOD kept, 8 JOD back.
    expect(changes).toEqual([{ previous: 'APPROVED', to: 'CANCELLED_BY_CUSTOMER', refund: 8_000 }]);
  });

  it('CUSTOMER on a PENDING booking refunds everything paid; a deposit booking follows its rule', async () => {
    const pending = seed({ status: 'PENDING' });
    await post(pending, 'cancel', { mode: 'CUSTOMER', reason: REASON });
    expect(changes.at(-1)).toMatchObject({ refund: 10_000 });
    const deposit = seed({
      paymentMethod: 'DEPOSIT',
      paymentStatus: 'DEPOSIT_PAID',
      money: { total: 10_000, dueOnline: 2_000, paidOnline: 2_000, remaining: 8_000, refunded: 0 },
      policySnapshot: {
        cancellationWindowHours: 2,
        depositRefundableOnCustomerCancel: false,
        noShowDeposit: 'KEEP',
        noShowFullPayment: 'KEEP',
      },
    });
    await post(deposit, 'cancel', { mode: 'CUSTOMER', reason: REASON });
    expect(changes.at(-1)).toMatchObject({ refund: 0 });
  });

  it('pay on arrival has nothing to refund in any mode', async () => {
    const id = seed({
      paymentMethod: 'PAY_ON_ARRIVAL',
      paymentStatus: 'PENDING',
      money: { total: 10_000, dueOnline: 0, paidOnline: 0, remaining: 10_000, refunded: 0 },
    });
    await post(id, 'cancel', { mode: 'CUSTOMER', reason: REASON });
    expect(changes.at(-1)?.refund).toBe(0);
  });

  it('only a PENDING or APPROVED booking can be cancelled this way; unknown is 404; bad input is 400', async () => {
    for (const status of ['COMPLETED', 'NO_SHOW', 'REJECTED', 'CANCELLED_BY_SALON']) {
      const res = await post(seed({ status }), 'cancel', { mode: 'SALON', reason: REASON });
      expect(res.status).toBe(422);
      expect(bodyOf(res).error?.code).toBe(ERROR_CODES.INVALID_TRANSITION);
    }
    expect(changes).toHaveLength(0);
    expect(
      (await post(new Types.ObjectId().toHexString(), 'cancel', { mode: 'SALON', reason: REASON }))
        .status,
    ).toBe(404);
    const id = seed();
    expect((await post(id, 'cancel', { mode: 'NOBODY', reason: REASON })).status).toBe(400);
    expect((await post(id, 'cancel', { mode: 'SALON' })).status).toBe(400);
    expect(stored(id)['status']).toBe('APPROVED');
  });
});

describe('admin booking refund of a chosen amount', () => {
  it('passes fils to the refund engine with the reason and the admin', async () => {
    const id = seed();
    const res = await post(id, 'refund', { amount: '2.500', reason: REASON });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({ id: 'r1', amount: '2.500', status: 'REFUNDED' });
    expect(refundCalls[0]).toMatchObject({
      bookingId: id,
      amount: 2_500,
      reason: REASON,
      actor: { adminId: adminId.toHexString() },
    });
  });

  it('refuses a missing reason, zero, negative or malformed amounts', async () => {
    const id = seed();
    expect((await post(id, 'refund', { amount: '2.500' })).status).toBe(400);
    for (const amount of ['0.000', '-1.000', '1.5555', 'abc', 5]) {
      expect((await post(id, 'refund', { amount, reason: REASON })).status).toBe(400);
    }
    expect(refundCalls).toHaveLength(0);
  });
});

describe('admin booking reassign and eligible staff', () => {
  it('lists the staff who pass the rules: not the current one, not inactive, not non-providers, not busy', async () => {
    const id = seed();
    ineligible.add(staffC.toHexString());
    const res = await request(app).get(`/admin/v1/bookings/${id}/eligible-staff?personIndex=0`);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual([{ staffId: staffB.toHexString(), name: 'Dina S' }]);
    busy.add(staffB.toHexString());
    expect(
      bodyOf(await request(app).get(`/admin/v1/bookings/${id}/eligible-staff?personIndex=0`)).data,
    ).toEqual([]);
  });

  it('eligible staff needs an APPROVED upcoming booking and a real person', async () => {
    const pending = seed({ status: 'PENDING' });
    expect(
      (await request(app).get(`/admin/v1/bookings/${pending}/eligible-staff?personIndex=0`)).status,
    ).toBe(422);
    const past = seed({}, -3);
    expect(
      (await request(app).get(`/admin/v1/bookings/${past}/eligible-staff?personIndex=0`)).status,
    ).toBe(422);
    const id = seed();
    expect(
      (await request(app).get(`/admin/v1/bookings/${id}/eligible-staff?personIndex=3`)).status,
    ).toBe(404);
    expect((await request(app).get(`/admin/v1/bookings/${id}/eligible-staff`)).status).toBe(400);
    expect(
      (await request(app).get(`/admin/v1/bookings/${id}/eligible-staff?personIndex=9`)).status,
    ).toBe(400);
  });

  it('reassigns with a reason: audited, parties told through the hook, any salon', async () => {
    const id = seed();
    const res = await post(id, 'reassign', {
      personIndex: 0,
      staffId: staffB.toHexString(),
      reason: REASON,
    });
    expect(res.status).toBe(200);
    expect(reassignedTo).toBe(staffB.toHexString());
    expect(reassignCalls).toEqual([{ from: staffA.toHexString(), to: staffB.toHexString() }]);
    expect(audits[0]).toMatchObject({
      action: 'BOOKING_ADMIN_REASSIGN',
      entityId: id,
      reason: REASON,
      before: { personIndex: 0, staffId: staffA.toHexString() },
      after: { personIndex: 0, staffId: staffB.toHexString() },
    });
  });

  it('refuses an ineligible or busy staff member, the same staff, and a booking that cannot move', async () => {
    const id = seed();
    ineligible.add(staffB.toHexString());
    const no = await post(id, 'reassign', {
      personIndex: 0,
      staffId: staffB.toHexString(),
      reason: REASON,
    });
    expect(no.status).toBe(422);
    expect(bodyOf(no).error?.code).toBe(ERROR_CODES.STAFF_NOT_ELIGIBLE);
    ineligible.clear();
    busy.add(staffC.toHexString());
    const taken = await post(id, 'reassign', {
      personIndex: 0,
      staffId: staffC.toHexString(),
      reason: REASON,
    });
    expect(taken.status).toBe(409);
    expect(bodyOf(taken).error?.code).toBe(ERROR_CODES.SLOT_TAKEN);
    expect(
      (
        await post(id, 'reassign', {
          personIndex: 0,
          staffId: staffA.toHexString(),
          reason: REASON,
        })
      ).status,
    ).toBe(422);
    const pending = seed({ status: 'PENDING' });
    expect(
      (
        await post(pending, 'reassign', {
          personIndex: 0,
          staffId: staffB.toHexString(),
          reason: REASON,
        })
      ).status,
    ).toBe(422);
    expect(
      (await post(id, 'reassign', { personIndex: 0, staffId: staffB.toHexString() })).status,
    ).toBe(400);
    expect(audits).toHaveLength(0);
    expect(reassignCalls).toHaveLength(0);
  });

  it('keeps the unrelated error classes distinguishable', () => {
    expect(new ConflictError({ code: ERROR_CODES.SLOT_TAKEN }).httpStatus).toBe(409);
  });
});
