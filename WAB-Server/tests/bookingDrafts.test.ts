import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAvailabilityService } from '../src/domain/availability/availability.service';
import { createHoldsStore } from '../src/domain/availability/holds';
import { createBookingDraftService } from '../src/domain/bookings/bookingDraft.service';
import { requireAuth } from '../src/middlewares/auth';
import { BookingDraftsRepository } from '../src/repositories/bookingDrafts.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { UnauthorizedError } from '../src/utils/errors';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
// Monday 2026-10-12 11:00 in Amman.
let clock = new Date('2026-10-12T08:00:00Z');
const PHONE = { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: '+962791234567' };
const resets: string[] = [];
const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  services: createFakeModel(),
  catalog: createFakeModel(),
  closures: createFakeModel(),
  leaves: createFakeModel(),
  customers: createFakeModel(),
  drafts: createFakeModel(),
};
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
  const availability = createAvailabilityService({
    salons: new SalonsRepository(m.salons.model as never),
    members: new MembersRepository(m.members.model as never),
    salonServices: new SalonServicesRepository(m.services.model as never),
    closures: new ClosuresRepository(m.closures.model as never),
    leaves: new LeavesRepository(m.leaves.model as never),
    holds,
    settings,
    now,
  });
  app = createApp({
    logger,
    services: {
      bookingDrafts: createBookingDraftService({
        redis,
        drafts: new BookingDraftsRepository(m.drafts.model as never),
        availability,
        holds,
        catalog: new CatalogServicesRepository(m.catalog.model as never),
        members: new MembersRepository(m.members.model as never),
        customers: new CustomersRepository(m.customers.model as never),
        salons: new SalonsRepository(m.salons.model as never),
        phones: {
          verify: (phone, otpToken, purpose) =>
            otpToken === 'valid-proof' &&
            phone.e164 === PHONE.e164 &&
            purpose === 'BOOKING_CONFIRMATION'
              ? Promise.resolve()
              : Promise.reject(new UnauthorizedError({ code: 'OTP_INVALID' })),
        },
        otpGate: { reset: (e164) => Promise.resolve(void resets.push(e164)) },
        settings,
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
    expiresAt: string;
    paymentMethod: string;
    persons: {
      name: string;
      isMain: boolean;
      isBride: boolean;
      staff: { id: string };
      staffSelection: string;
      start: string;
      end: string;
      subtotal: string;
      services: { price: string; name: string }[];
    }[];
    money: { total: string; deposit: string; dueOnline: string; remaining: string };
  };
  error: { code: string; details?: { field: string }[] };
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
const vip = id();
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
const draft = (persons: object[], over: Record<string, unknown> = {}, who = me): request.Test =>
  request(app)
    .post('/customer/v1/bookings/drafts')
    .set('Authorization', tokenOf(who))
    .send({ salonId: salonId.toHexString(), paymentMethod: 'DEPOSIT', persons, ...over });

beforeEach(async () => {
  await redis.flushdb();
  clock = new Date('2026-10-12T08:00:00Z');
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    weeklySchedule: week,
    policy,
  });
  m.catalog.docs.push({ _id: catalogCut, name: { ar: 'قص', en: 'Haircut' } });
  for (const [_id, price, durationMinutes, brideOnly] of [
    [cut, 20000, 45, false],
    [color, 35500, 60, false],
    [vip, 90000, 120, true],
  ] as const) {
    m.services.docs.push({
      _id,
      salonId,
      catalogServiceId: catalogCut,
      active: true,
      price,
      durationMinutes,
      brideOnly,
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
      staff: profile([cut, vip], true),
    },
  );
  for (const who of [me, other]) {
    m.customers.docs.push({
      _id: who,
      firstName: 'C',
      gender: 'FEMALE',
      status: 'ACTIVE',
      phone: PHONE,
    });
  }
});

describe('creating a draft', () => {
  it('prices the booking, snapshots services and policy, assigns staff and holds the slots', async () => {
    const res = await draft([person({ serviceIds: [cut.toHexString(), color.toHexString()] })]);
    expect(res.status).toBe(201);
    const d = bodyOf(res).data;
    expect(d.money).toEqual({
      total: '55.500',
      deposit: '11.100',
      dueOnline: '11.100',
      remaining: '44.400',
    });
    expect(d.persons[0]).toMatchObject({
      name: 'Noor',
      isMain: true,
      staffSelection: 'ANY',
      subtotal: '55.500',
      start: amman(D, '10:00'),
      end: amman(D, '11:45'),
      staff: { id: staffA.toHexString() }, // only A does both services
    });
    expect(d.persons[0]?.services[0]).toMatchObject({ name: 'قص', price: '20.000' });
    expect(new Date(d.expiresAt).getTime()).toBe(clock.getTime() + 10 * 60_000);
    const stored = m.drafts.docs[0];
    expect(stored?.['policySnapshot']).toMatchObject({ depositPercentage: 20 });
    expect(stored?.['totals']).toEqual({ total: 55500, dueOnline: 11100 });
    expect(await redis.zcard(`hold:${staffA.toHexString()}:${D}`)).toBe(1);
  });

  it('pay on arrival has nothing due online; the stored snapshot ignores later price changes', async () => {
    const res = await draft([person()], { paymentMethod: 'PAY_ON_ARRIVAL' });
    expect(bodyOf(res).data.money).toMatchObject({ dueOnline: '0.000', remaining: '20.000' });
    for (const doc of m.services.docs) doc['price'] = 99999;
    const again = await request(app)
      .get(`/customer/v1/bookings/drafts/${bodyOf(res).data.id}`)
      .set('Authorization', tokenOf(me));
    expect(bodyOf(again).data.money.total).toBe('20.000');
  });

  it('checks persons in order: a companion cannot take the staff already used at that time', async () => {
    const same = person({ name: 'Mum', start: amman(D, '10:00') });
    const res = await draft([
      person({ staffId: staffA.toHexString() }),
      { ...same, staffId: staffA.toHexString() },
    ]);
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('SLOT_UNAVAILABLE');
    expect(bodyOf(res).error.details?.[0]?.field).toBe('persons.1.start');
    // "Any available staff" moves the companion to the other staff member.
    const ok = await draft([person(), { ...same }]);
    expect(ok.status).toBe(201);
    const staff = bodyOf(ok).data.persons.map((p) => p.staff.id);
    expect(new Set(staff).size).toBe(2);
    expect(bodyOf(ok).data.persons.map((p) => p.isMain)).toEqual([true, false]);
  });

  it('a bride is served by bride-qualified staff and may book bride-only services', async () => {
    const res = await draft([person({ isBride: true, serviceIds: [vip.toHexString()] })]);
    expect(res.status).toBe(201);
    expect(bodyOf(res).data.persons[0]).toMatchObject({
      isBride: true,
      staff: { id: staffB.toHexString() },
    });
  });

  describe('business types (§5.19)', () => {
    const asBusiness = (businessType: string, audience: string): void => {
      for (const doc of m.salons.docs) Object.assign(doc, { businessType, audience });
    };
    const mixed = (): object[] => [
      person({ name: 'Noor', gender: 'FEMALE' }),
      person({ name: 'Omar', gender: 'MALE', start: amman(D, '11:00') }),
    ];

    it('a BOTH salon takes a woman and a man in one booking; genders are kept', async () => {
      asBusiness('SALON', 'BOTH');
      const res = await draft(mixed());
      expect(res.status).toBe(201);
      expect(
        bodyOf(res).data.persons.map((p) => (p as unknown as { gender: string }).gender),
      ).toEqual(['FEMALE', 'MALE']);
      const stored = m.drafts.docs[0]?.['persons'] as { gender?: string }[];
      expect(stored.map((p) => p.gender)).toEqual(['FEMALE', 'MALE']);
    });

    it('a clinic takes mixed persons but never a bride', async () => {
      asBusiness('CLINIC', 'BOTH');
      expect((await draft(mixed())).status).toBe(201);
      await redis.flushdb();
      m.drafts.docs.length = 0;
      const bride = await draft([person({ isBride: true, gender: 'FEMALE' })]);
      expect(bride.status).toBe(422);
      expect(bodyOf(bride).error.code).toBe('BRIDE_NOT_ALLOWED');
    });

    it('a women’s salon still refuses a man (GENDER_MISMATCH); a missing gender means the salon’s', async () => {
      const res = await draft(mixed());
      expect(res.status).toBe(422);
      expect(bodyOf(res).error.code).toBe('GENDER_MISMATCH');
      expect(bodyOf(res).error.details?.[0]?.field).toBe('persons.1.gender');
      expect(m.drafts.docs).toHaveLength(0);
      const plain = await draft([person()]);
      expect(plain.status).toBe(201);
      expect((bodyOf(plain).data.persons[0] as unknown as { gender: string }).gender).toBe(
        'FEMALE',
      );
    });

    it('a bride sent as a man is a gender mismatch, even at a BOTH salon', async () => {
      asBusiness('SALON', 'BOTH');
      const res = await draft([person({ isBride: true, gender: 'MALE' })]);
      expect(res.status).toBe(422);
      expect(bodyOf(res).error.code).toBe('GENDER_MISMATCH');
    });

    it('a customer cannot book a business they may not see (404)', async () => {
      asBusiness('SALON', 'MALE');
      const res = await draft([person({ gender: 'MALE' })]);
      expect(res.status).toBe(404);
      expect(bodyOf(res).error.code).toBe('SALON_NOT_FOUND');
      expect(m.drafts.docs).toHaveLength(0);
    });
  });

  const menOnly = (): void => {
    for (const doc of m.salons.docs) doc['audience'] = 'MALE';
  };
  const noSetup = (): void => undefined;
  it.each<[string, () => object[], string, () => void]>([
    [
      'seven persons',
      () => Array.from({ length: 7 }, () => person()),
      'TOO_MANY_COMPANIONS',
      noSetup,
    ],
    ['a bride at a men’s salon', () => [person({ isBride: true })], 'BRIDE_NOT_ALLOWED', menOnly],
    [
      'an unknown service',
      () => [person({ serviceIds: [id().toHexString()] })],
      'SERVICE_UNAVAILABLE',
      noSetup,
    ],
    [
      'a bride-only service for a non-bride',
      () => [person({ serviceIds: [vip.toHexString()] })],
      'BRIDE_ONLY_SERVICE',
      noSetup,
    ],
    [
      'staff of another salon',
      () => [person({ staffId: id().toHexString() })],
      'STAFF_NOT_ELIGIBLE',
      noSetup,
    ],
    ['a day off', () => [person({ start: amman('2026-10-16', '10:00') })], 'SALON_CLOSED', noSetup],
    [
      'a past day',
      () => [person({ start: amman('2026-10-11', '10:00') })],
      'DATE_OUT_OF_RANGE',
      noSetup,
    ],
    [
      'too far ahead',
      () => [person({ start: amman('2027-01-11', '10:00') })],
      'DATE_OUT_OF_RANGE',
      noSetup,
    ],
    [
      'a time off the grid',
      () => [person({ start: amman(D, '10:07') })],
      'SLOT_UNAVAILABLE',
      noSetup,
    ],
    ['after closing', () => [person({ start: amman(D, '17:30') })], 'SLOT_UNAVAILABLE', noSetup],
  ])('rejects %s', async (_name, build, code, setup) => {
    setup();
    const res = await draft(build());
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe(code);
    expect(m.drafts.docs).toHaveLength(0);
  });

  it('refuses a payment option the salon does not offer and salons that cannot be booked', async () => {
    const full = await draft([person()], { paymentMethod: 'FULL_ONLINE' });
    expect(full.status).toBe(422);
    expect(bodyOf(full).error.code).toBe('PAYMENT_OPTION_NOT_ALLOWED');
    for (const doc of m.salons.docs) doc['state'] = 'OFFLINE';
    const off = await draft([person()]);
    expect(bodyOf(off).error.code).toBe('SALON_NOT_BOOKABLE');
  });

  it('refuses a blocked customer and needs a token', async () => {
    for (const doc of m.customers.docs) doc['status'] = 'BLOCKED';
    expect((await draft([person()])).status).toBe(403);
    const anon = await request(app).post('/customer/v1/bookings/drafts').send({});
    expect(anon.status).toBe(401);
  });

  it.each([
    ['no persons', { persons: [] }],
    ['a blank name', { persons: [person({ name: ' ' })] }],
    ['no services', { persons: [person({ serviceIds: [] })] }],
    ['a bad start', { persons: [person({ start: 'tomorrow' })] }],
    ['an unknown payment method', { paymentMethod: 'CASH' }],
  ])('validates the body: %s', async (_n, over) => {
    const res = await draft([person()], over);
    expect(res.status).toBe(400);
  });
});

describe('holds and replacing drafts', () => {
  it('another customer cannot take a held slot until the draft expires or is discarded', async () => {
    const first = await draft([person({ staffId: staffA.toHexString() })]);
    expect(first.status).toBe(201);
    const blocked = await draft([person({ staffId: staffA.toHexString() })], {}, other);
    expect(bodyOf(blocked).error.code).toBe('SLOT_UNAVAILABLE');
    // After the hold lifetime (10 minutes) the slot is free again.
    clock = new Date(clock.getTime() + 10 * 60_000);
    expect((await draft([person({ staffId: staffA.toHexString() })], {}, other)).status).toBe(201);
  });

  it('a new draft replaces the old one, frees its holds and may reuse its own slot', async () => {
    const first = await draft([person({ staffId: staffA.toHexString() })]);
    const second = await draft([person({ staffId: staffA.toHexString() })]);
    expect(second.status).toBe(201);
    expect(m.drafts.docs).toHaveLength(1);
    expect(String(m.drafts.docs[0]?.['_id'])).toBe(bodyOf(second).data.id);
    expect(bodyOf(first).data.id).not.toBe(bodyOf(second).data.id);
    expect(await redis.zcard(`hold:${staffA.toHexString()}:${D}`)).toBe(1);
    // Moving to another time releases the first slot.
    await draft([person({ staffId: staffA.toHexString(), start: amman(D, '14:00') })]);
    const free = await draft([person({ staffId: staffA.toHexString() })], {}, other);
    expect(free.status).toBe(201);
  });

  it('two customers racing for one slot: exactly one wins', async () => {
    for (const doc of m.members.docs) {
      if (String(doc['_id']) === staffB.toHexString()) doc['active'] = false;
    }
    const results = await Promise.all([draft([person()], {}, me), draft([person()], {}, other)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(m.drafts.docs).toHaveLength(1);
  });

  it('discard frees the slot and is idempotent; other customers’ drafts are untouched', async () => {
    const res = await draft([person({ staffId: staffA.toHexString() })]);
    const draftId = bodyOf(res).data.id;
    const del = (who: Types.ObjectId): request.Test =>
      request(app)
        .delete(`/customer/v1/bookings/drafts/${draftId}`)
        .set('Authorization', tokenOf(who));
    await del(other);
    expect(m.drafts.docs).toHaveLength(1);
    expect((await del(me)).status).toBe(200);
    expect((await del(me)).status).toBe(200);
    expect(m.drafts.docs).toHaveLength(0);
    expect((await draft([person({ staffId: staffA.toHexString() })], {}, other)).status).toBe(201);
  });
});

describe('reading a draft', () => {
  it('shows my draft in my language and hides it from others', async () => {
    const res = await draft([person()]);
    const read = (who: Types.ObjectId, lang = 'ar'): request.Test =>
      request(app)
        .get(`/customer/v1/bookings/drafts/${bodyOf(res).data.id}`)
        .set('Authorization', tokenOf(who))
        .set('Accept-Language', lang);
    expect(bodyOf(await read(me)).data.persons[0]?.services[0]?.name).toBe('قص');
    expect(bodyOf(await read(me, 'en')).data.persons[0]?.services[0]?.name).toBe('Haircut');
    expect((await read(other)).status).toBe(404);
  });

  it('an expired draft answers DRAFT_EXPIRED and is cleaned up', async () => {
    const res = await draft([person({ staffId: staffA.toHexString() })]);
    clock = new Date(clock.getTime() + 11 * 60_000);
    const read = await request(app)
      .get(`/customer/v1/bookings/drafts/${bodyOf(res).data.id}`)
      .set('Authorization', tokenOf(me));
    expect(read.status).toBe(422);
    expect(bodyOf(read).error.code).toBe('DRAFT_EXPIRED');
    expect(m.drafts.docs).toHaveLength(0);
  });
});
