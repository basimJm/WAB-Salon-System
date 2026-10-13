import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAvailabilityService } from '../src/domain/availability/availability.service';
import { createHoldsStore } from '../src/domain/availability/holds';
import { createBookingCreationService } from '../src/domain/bookings/bookingCreation.service';
import { createDirectRefunds } from '../src/domain/refunds/directRefunds';
import { FakePaymentProvider } from '../src/providers/payments/fake';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { createBookingDraftService } from '../src/domain/bookings/bookingDraft.service';
import { requireAuth } from '../src/middlewares/auth';
import { BookingDraftsRepository } from '../src/repositories/bookingDrafts.repository';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { UnauthorizedError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const PHONE = { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: '+962791234567' };
let clock = new Date('2026-10-12T08:00:00Z'); // Monday 11:00 in Amman
const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  services: createFakeModel(),
  catalog: createFakeModel(),
  closures: createFakeModel(),
  leaves: createFakeModel(),
  customers: createFakeModel(),
  drafts: createFakeModel(),
  bookings: createFakeModel(),
  tx: createFakeModel(),
};
const gateway = new FakePaymentProvider();
const created: string[] = [];
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const holds = createHoldsStore(redis);
  const settings = {
    get: ((key: string) => Promise.resolve(SETTING_DEFAULTS[key as never])) as never,
  };
  const now = (): Date => clock;
  const bookings = new BookingsRepository(m.bookings.model as never);
  const drafts = new BookingDraftsRepository(m.drafts.model as never);
  const customers = new CustomersRepository(m.customers.model as never);
  const availability = createAvailabilityService({
    salons: new SalonsRepository(m.salons.model as never),
    members: new MembersRepository(m.members.model as never),
    salonServices: new SalonServicesRepository(m.services.model as never),
    closures: new ClosuresRepository(m.closures.model as never),
    leaves: new LeavesRepository(m.leaves.model as never),
    bookings,
    holds,
    settings,
    now,
  });
  app = createApp({
    logger,
    services: {
      bookingDrafts: createBookingDraftService({
        redis,
        drafts,
        availability,
        holds,
        catalog: new CatalogServicesRepository(m.catalog.model as never),
        members: new MembersRepository(m.members.model as never),
        customers,
        salons: new SalonsRepository(m.salons.model as never),
        phones: {
          verify: (phone, idToken) =>
            idToken === 'valid-proof' && phone.e164 === PHONE.e164
              ? Promise.resolve()
              : Promise.reject(new UnauthorizedError({ code: 'OTP_INVALID' })),
        },
        otpGate: { reset: () => Promise.resolve() },
        settings,
        now,
      }),
      bookings: createBookingCreationService({
        transactions: new TransactionsRepository(m.tx.model as never),
        refunds: createDirectRefunds({
          transactions: new TransactionsRepository(m.tx.model as never),
          provider: gateway,
          logger,
          now,
        }),
        redis,
        drafts,
        bookings,
        availability,
        holds,
        customers,
        settings,
        hook: {
          created: (booking) => {
            created.push(booking.id);
            return Promise.resolve();
          },
        },
        now,
      }),
      installations: {
        service: undefined as never,
        customerOptional: requireAuth('customer', SECRET),
        customerRequired: requireAuth('customer', SECRET),
        merchantRequired: requireAuth('merchant', SECRET),
      },
    },
  });
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});

interface Body {
  data: {
    id: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    appointmentStart: string;
    appointmentEnd: string;
    respondBy: string;
    money: { total: string; dueOnline: string; paidOnline: string; remaining: string };
    otpVerifiedAt: string;
  };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const me = id();
const other = id();
const tokenOf = (who: Types.ObjectId): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: who.toHexString(), ttlSec: 600 }).token}`;
const salonId = id();
const cut = id();
const color = id();
const staffA = id();
const staffB = id();
const catalogCut = id();
const week = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '09:00',
  close: '18:00',
}));
const amman = (date: string, hhmm: string): string =>
  new Date(`${date}T${hhmm}:00+03:00`).toISOString();
const D = '2026-10-13';
const policy = {
  cancellationWindowHours: 24,
  paymentOptions: ['PAY_ON_ARRIVAL', 'DEPOSIT'],
  depositPercentage: 20,
  depositRefundableOnCustomerCancel: false,
  fullPaymentRefundOnCustomerCancel: 'FULL',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'KEEP',
};
const profile = (serviceIds: Types.ObjectId[], bride = false): object => ({
  serviceIds,
  brideQualified: bride,
  workingDays: week.map((d) => ({ day: d.day })),
  rating: { avg: 0, count: 0 },
});
const person = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Noor',
  isBride: false,
  serviceIds: [cut.toHexString()],
  start: amman(D, '10:00'),
  ...over,
});
const post = (path: string, body: object, who = me): request.Test =>
  request(app).post(`/customer/v1${path}`).set('Authorization', tokenOf(who)).send(body);
const makeDraft = async (
  persons: object[] = [person({ staffId: staffA.toHexString() })],
  paymentMethod = 'PAY_ON_ARRIVAL',
  who = me,
): Promise<string> => {
  const res = await post(
    '/bookings/drafts',
    { salonId: salonId.toHexString(), paymentMethod, persons },
    who,
  );
  expect(res.status).toBe(201);
  return bodyOf(res).data.id;
};
const confirm = async (draftId: string, who = me): Promise<void> => {
  const res = await post(`/bookings/drafts/${draftId}/verify-otp`, { idToken: 'valid-proof' }, who);
  expect(res.status).toBe(200);
};
const book = (draftId: string, who = me): request.Test => post('/bookings', { draftId }, who);

beforeEach(async () => {
  await redis.flushdb();
  clock = new Date('2026-10-12T08:00:00Z');
  created.length = 0;
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    weeklySchedule: week,
    policy,
  });
  m.catalog.docs.push({ _id: catalogCut, name: { ar: 'قص', en: 'Haircut' } });
  for (const [_id, price, durationMinutes] of [
    [cut, 20000, 45],
    [color, 35500, 60],
  ] as const) {
    m.services.docs.push({
      _id,
      salonId,
      catalogServiceId: catalogCut,
      active: true,
      price,
      durationMinutes,
      brideOnly: false,
    });
  }
  m.members.docs.push(
    {
      _id: staffA,
      salonId,
      firstName: 'Lina',
      active: true,
      providesServices: true,
      staff: profile([cut, color]),
    },
    {
      _id: staffB,
      salonId,
      firstName: 'Sara',
      active: true,
      providesServices: true,
      staff: profile([cut], true),
    },
  );
  for (const who of [me, other]) {
    m.customers.docs.push({ _id: who, firstName: 'C', status: 'ACTIVE', phone: PHONE });
  }
});

describe('OTP confirmation of a draft', () => {
  it('accepts the customer’s own proof and records the time', async () => {
    const draftId = await makeDraft();
    const res = await post(`/bookings/drafts/${draftId}/verify-otp`, { idToken: 'valid-proof' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.otpVerifiedAt).toBe(clock.toISOString());
    expect(m.drafts.docs[0]?.['otpVerifiedAt']).toEqual(clock);
  });

  it('refuses a wrong proof, another customer’s draft and an expired draft', async () => {
    const draftId = await makeDraft();
    const bad = await post(`/bookings/drafts/${draftId}/verify-otp`, { idToken: 'nope' });
    expect(bad.status).toBe(401);
    expect(bodyOf(bad).error.code).toBe('OTP_INVALID');
    expect(
      (await post(`/bookings/drafts/${draftId}/verify-otp`, { idToken: 'valid-proof' }, other))
        .status,
    ).toBe(404);
    clock = new Date(clock.getTime() + 11 * 60_000);
    const late = await post(`/bookings/drafts/${draftId}/verify-otp`, { idToken: 'valid-proof' });
    expect(bodyOf(late).error.code).toBe('DRAFT_EXPIRED');
    expect((await post(`/bookings/drafts/${draftId}/verify-otp`, {})).status).toBe(400);
  });
});

describe('POST /customer/v1/bookings', () => {
  it('creates a PENDING pay-on-arrival booking from a confirmed draft', async () => {
    const draftId = await makeDraft([
      person({ staffId: staffA.toHexString() }),
      person({
        name: 'Mum',
        serviceIds: [cut.toHexString(), color.toHexString()],
        start: amman(D, '11:00'),
      }),
    ]);
    await confirm(draftId);
    const res = await book(draftId);
    expect(res.status).toBe(201);
    const b = bodyOf(res).data;
    expect(b).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'PAY_ON_ARRIVAL',
      appointmentStart: amman(D, '10:00'),
      money: { total: '75.500', dueOnline: '0.000', paidOnline: '0.000', remaining: '75.500' },
    });
    expect(b.referenceNumber).toMatch(/^WAB-[0-9A-HJKMNP-TV-Z]{6}$/);
    // The companion starts at 11:00 and needs 105 minutes; respond within 60 minutes of the first start.
    expect(b.appointmentEnd).toBe(amman(D, '12:45'));
    expect(b.respondBy).toBe(amman(D, '11:00'));
    const stored = m.bookings.docs[0];
    expect(stored).toMatchObject({
      status: 'PENDING',
      salonGender: 'FEMALE',
      hasBride: false,
      paymentMethod: 'PAY_ON_ARRIVAL',
      refundStatus: 'NONE',
      ratingPromptSent: false,
    });
    expect(stored?.['statusHistory']).toEqual([
      { status: 'PENDING', actorType: 'CUSTOMER', actorId: me, at: clock },
    ]);
    expect(stored?.['money']).toEqual({
      total: 75500,
      dueOnline: 0,
      paidOnline: 0,
      remaining: 75500,
      refunded: 0,
    });
    expect((stored?.['persons'] as unknown[]).length).toBe(2);
    expect(stored?.['policySnapshot']).toMatchObject({ cancellationWindowHours: 24 });
    expect(created).toEqual([b.id]);
  });

  it('frees the draft and its holds, and the booked time is no longer offered', async () => {
    const draftId = await makeDraft();
    await confirm(draftId);
    await book(draftId);
    expect(m.drafts.docs).toHaveLength(0);
    expect(await redis.zcard(`hold:${staffA.toHexString()}:${D}`)).toBe(0);
    const again = await post(
      '/bookings/drafts',
      {
        salonId: salonId.toHexString(),
        paymentMethod: 'PAY_ON_ARRIVAL',
        persons: [person({ staffId: staffA.toHexString() })],
      },
      other,
    );
    expect(bodyOf(again).error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('needs the OTP confirmation first and an online draft needs a verified payment', async () => {
    const draftId = await makeDraft();
    const early = await book(draftId);
    expect(early.status).toBe(422);
    expect(bodyOf(early).error.code).toBe('OTP_INVALID');
    expect(m.bookings.docs).toHaveLength(0);
    const deposit = await makeDraft([person({ start: amman(D, '14:00') })], 'DEPOSIT');
    await confirm(deposit);
    const res = await book(deposit);
    expect(bodyOf(res).error.code).toBe('PAYMENT_NOT_VERIFIED');
    expect(m.bookings.docs).toHaveLength(0);
  });

  it('refuses another customer’s draft, an expired draft, a blocked customer and no token', async () => {
    const draftId = await makeDraft();
    await confirm(draftId);
    expect((await book(draftId, other)).status).toBe(404);
    expect((await request(app).post('/customer/v1/bookings').send({ draftId })).status).toBe(401);
    expect((await post('/bookings', { draftId: 'x' })).status).toBe(400);
    for (const doc of m.customers.docs) {
      if (String(doc['_id']) === me.toHexString()) doc['status'] = 'BLOCKED';
    }
    expect((await book(draftId)).status).toBe(403);
    for (const doc of m.customers.docs) doc['status'] = 'ACTIVE';
    clock = new Date(clock.getTime() + 11 * 60_000);
    expect(bodyOf(await book(draftId)).error.code).toBe('DRAFT_EXPIRED');
    expect(m.bookings.docs).toHaveLength(0);
  });

  it('a slot booked by someone else after the draft is SLOT_TAKEN (409) and nothing is created', async () => {
    const draftId = await makeDraft();
    await confirm(draftId);
    m.bookings.docs.push({
      _id: id(),
      salonId,
      status: 'APPROVED',
      appointmentStart: new Date(amman(D, '10:15')),
      appointmentEnd: new Date(amman(D, '11:00')),
      persons: [
        { staffId: staffA, start: new Date(amman(D, '10:15')), end: new Date(amman(D, '11:00')) },
      ],
    });
    const res = await book(draftId);
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SLOT_TAKEN');
    expect(m.bookings.docs).toHaveLength(1);
    expect(m.drafts.docs).toHaveLength(1);
  });

  it('cancelled and rejected bookings do not block', async () => {
    const draftId = await makeDraft();
    await confirm(draftId);
    m.bookings.docs.push({
      _id: id(),
      salonId,
      status: 'CANCELLED_BY_SALON',
      appointmentStart: new Date(amman(D, '10:00')),
      appointmentEnd: new Date(amman(D, '10:45')),
      persons: [
        { staffId: staffA, start: new Date(amman(D, '10:00')), end: new Date(amman(D, '10:45')) },
      ],
    });
    expect((await book(draftId)).status).toBe(201);
  });

  it('two confirmed drafts for the same slot: exactly one booking is created', async () => {
    const first = await makeDraft();
    await confirm(first);
    // A second draft for the same staff and time cannot be made through the API (holds), so copy it.
    const copy = { ...m.drafts.docs[0], _id: id(), customerId: other };
    m.drafts.docs.push(copy);
    const results = await Promise.all([book(first), book(String(copy._id), other)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(m.bookings.docs).toHaveLength(1);
  });

  it('an "any staff" booking moves to the other staff member when the first one went busy', async () => {
    const draftId = await makeDraft([person()]); // A and B can both cut; lowest id wins the draft
    await confirm(draftId);
    const assigned = String((m.drafts.docs[0]?.['persons'] as { staffId: unknown }[])[0]?.staffId);
    m.bookings.docs.push({
      _id: id(),
      salonId,
      status: 'PENDING',
      appointmentStart: new Date(amman(D, '09:30')),
      appointmentEnd: new Date(amman(D, '10:30')),
      persons: [
        {
          staffId: new Types.ObjectId(assigned),
          start: new Date(amman(D, '09:30')),
          end: new Date(amman(D, '10:30')),
        },
      ],
    });
    const res = await book(draftId);
    expect(res.status).toBe(201);
    const bookedStaff = String(
      ((m.bookings.docs.at(-1)?.['persons'] ?? []) as { staffId: unknown }[])[0]?.staffId,
    );
    expect(bookedStaff).not.toBe(assigned);
  });
});

describe('bookings repository lookups', () => {
  it('lists busy intervals and upcoming bookings of live bookings only', async () => {
    const repo = new BookingsRepository(m.bookings.model as never);
    const person1 = {
      staffId: staffA,
      start: new Date(amman(D, '10:00')),
      end: new Date(amman(D, '11:00')),
      services: [{ salonServiceId: cut }],
    };
    m.bookings.docs.push(
      {
        _id: id(),
        salonId,
        status: 'PENDING',
        appointmentStart: person1.start,
        appointmentEnd: person1.end,
        persons: [person1],
      },
      {
        _id: id(),
        salonId,
        status: 'REJECTED',
        appointmentStart: person1.start,
        appointmentEnd: person1.end,
        persons: [person1],
      },
      {
        _id: id(),
        salonId: id(),
        status: 'PENDING',
        appointmentStart: person1.start,
        appointmentEnd: person1.end,
        persons: [person1],
      },
    );
    const busy = await repo.busy({
      salonId: salonId.toHexString(),
      from: new Date(amman(D, '00:00')),
      to: new Date(amman('2026-10-14', '00:00')),
    });
    expect(busy).toHaveLength(1);
    expect(busy[0]?.staffId).toBe(staffA.toHexString());
    const upcoming = await repo.upcomingForSalon(salonId.toHexString(), clock);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.persons[0]?.serviceIds).toEqual([cut.toHexString()]);
    expect(
      await repo.overlapping(
        staffA.toHexString(),
        new Date(amman(D, '10:30')),
        new Date(amman(D, '11:30')),
      ),
    ).toBe(true);
    expect(
      await repo.overlapping(
        staffA.toHexString(),
        new Date(amman(D, '11:00')),
        new Date(amman(D, '12:00')),
      ),
    ).toBe(false);
    expect(
      await repo.overlapping(
        staffB.toHexString(),
        new Date(amman(D, '10:30')),
        new Date(amman(D, '11:30')),
      ),
    ).toBe(false);
  });
});

describe('paid bookings (SRV-085)', () => {
  /** A DEPOSIT draft with a payment attempt of the given status linked to it. */
  const paidDraft = async (
    status: string = 'SUCCEEDED',
    over: Record<string, unknown> = {},
  ): Promise<{ draftId: string; txId: string; due: number }> => {
    const draftId = await makeDraft([person({ staffId: staffA.toHexString() })], 'DEPOSIT');
    await confirm(draftId);
    const draft = m.drafts.docs[0] ?? {};
    const due = (draft['totals'] as { dueOnline: number }).dueOnline;
    const session = await gateway.createSession({
      idempotencyKey: `k:${draftId}:${String(m.tx.docs.length)}`,
      amountFils: due,
      reference: draftId,
    });
    const txId = id();
    m.tx.docs.push({
      _id: txId,
      bookingDraftId: new Types.ObjectId(draftId),
      customerId: me,
      salonId,
      status,
      amount: due,
      providerRef: session.sessionId,
      ...over,
    });
    draft['transactionId'] = txId;
    return { draftId, txId: txId.toHexString(), due };
  };
  const tx = (): Record<string, unknown> => m.tx.docs[0] ?? {};

  it('creates the booking from a verified payment with the paid amounts and links the payment', async () => {
    const { draftId, due } = await paidDraft();
    const res = await book(draftId);
    expect(res.status).toBe(201);
    const stored = m.bookings.docs[0] ?? {};
    expect(stored).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'DEPOSIT_PAID',
      money: { dueOnline: due, paidOnline: due, remaining: 20000 - due, refunded: 0 },
    });
    expect(String(tx()['bookingId'])).toBe(String(stored['_id']));
    expect(tx()['refundedAt']).toBeUndefined();
  });

  it('a failed, cancelled or still pending payment never creates a booking', async () => {
    for (const status of ['FAILED', 'CANCELLED', 'PENDING']) {
      m.tx.docs.length = 0;
      m.drafts.docs.length = 0;
      await redis.flushdb();
      const { draftId } = await paidDraft(status);
      const res = await book(draftId);
      expect(res.status).toBe(422);
      expect(bodyOf(res).error.code).toBe('PAYMENT_NOT_VERIFIED');
    }
    expect(m.bookings.docs).toHaveLength(0);
  });

  it('refuses a payment that is the wrong amount, another customer’s, used or already refunded', async () => {
    const cases: Record<string, unknown>[] = [
      { amount: 1 },
      { customerId: other },
      { bookingId: id() },
      { refundedAt: clock },
    ];
    for (const over of cases) {
      m.tx.docs.length = 0;
      m.drafts.docs.length = 0;
      await redis.flushdb();
      const { draftId } = await paidDraft('SUCCEEDED', over);
      const res = await book(draftId);
      expect(bodyOf(res).error.code).toBe('PAYMENT_NOT_VERIFIED');
    }
    expect(m.bookings.docs).toHaveLength(0);
  });

  it('a draft without any payment attempt is refused', async () => {
    const draftId = await makeDraft([person({ staffId: staffA.toHexString() })], 'DEPOSIT');
    await confirm(draftId);
    expect(bodyOf(await book(draftId)).error.code).toBe('PAYMENT_NOT_VERIFIED');
  });

  it('slot taken after payment: 409 SLOT_TAKEN and the whole payment is refunded at once', async () => {
    const { draftId } = await paidDraft();
    const start = new Date(amman(D, '10:00'));
    m.bookings.docs.push({
      _id: id(),
      salonId,
      status: 'PENDING',
      persons: [{ staffId: staffA, start, end: new Date(start.getTime() + 45 * 60_000) }],
      appointmentStart: start,
      appointmentEnd: new Date(start.getTime() + 45 * 60_000),
    });
    const res = await book(draftId);
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SLOT_TAKEN');
    expect(m.bookings.docs).toHaveLength(1);
    expect(tx()['refundedAt']).toEqual(clock);
    expect(tx()['bookingId']).toBeUndefined();
    // Retrying cannot turn the refunded payment into a booking later.
    m.bookings.docs.length = 0;
    expect(bodyOf(await book(draftId)).error.code).toBe('PAYMENT_NOT_VERIFIED');
    expect(m.bookings.docs).toHaveLength(0);
  });

  it('an expired draft with a successful payment refunds it', async () => {
    const { draftId } = await paidDraft();
    clock = new Date(clock.getTime() + 11 * 60_000);
    const res = await book(draftId);
    expect(bodyOf(res).error.code).toBe('DRAFT_EXPIRED');
    expect(tx()['refundedAt']).toEqual(clock);
  });

  it('two parallel creates from one payment make exactly one booking', async () => {
    const { draftId } = await paidDraft();
    const results = await Promise.all([book(draftId), book(draftId)]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(m.bookings.docs).toHaveLength(1);
  });
});
