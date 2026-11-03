import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import type { BookingPlan } from '../src/domain/availability/availability.service';
import {
  createBookingClaims,
  createMerchantBookingService,
  type MerchantBookingService,
} from '../src/domain/bookings/merchantBooking.service';
import type { BookingRaw } from '../src/models/booking.model';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import type { Entity } from '../src/utils/database/plain';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const id = (): string => new Types.ObjectId().toHexString();
const SALON = id();
const MEMBER = id();
const STAFF = id();
const CATALOG = id();
const SERVICE = id();
const START = new Date('2026-11-10T09:00:00Z');
const END = new Date('2026-11-10T09:30:00Z');
const PHONE = { countryCode: 'JO', number: '791234567' };
const E164 = '+962791234567';

let testRedis: TestRedis;
let redis: Redis;
beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});

type Kind = { businessType: 'SALON' | 'CLINIC' | 'TATTOO'; audience: 'MALE' | 'FEMALE' | 'BOTH' };

const rig = (
  options: {
    kind?: Kind;
    account?: Record<string, unknown> | null;
    overlap?: boolean;
  } = {},
): {
  service: MerchantBookingService;
  model: ReturnType<typeof createFakeModel>;
  plans: unknown[];
  created: Entity<BookingRaw>[];
  imageChecks: { keys: readonly string[]; accept?: (u: never) => boolean }[];
} => {
  const kind = options.kind ?? { businessType: 'SALON', audience: 'FEMALE' };
  const model = createFakeModel();
  const repository = new BookingsRepository(model.model as never);
  const plans: unknown[] = [];
  const created: Entity<BookingRaw>[] = [];
  const imageChecks: { keys: readonly string[]; accept?: (u: never) => boolean }[] = [];
  const plan = (input: { persons: readonly { name: string; gender?: string }[] }): BookingPlan =>
    ({
      salon: {
        id: SALON,
        ...kind,
        policy: {
          cancellationWindowHours: 2,
          paymentOptions: ['PAY_ON_ARRIVAL'],
          depositPercentage: 0,
        },
      },
      branch: null,
      persons: input.persons.map((p) => ({
        name: p.name,
        isBride: false,
        gender: p.gender,
        services: [{ id: SERVICE, catalogServiceId: CATALOG, price: 8_000, durationMinutes: 30 }],
        staffId: STAFF,
        staffSelection: 'SPECIFIC',
        start: START,
        end: END,
      })),
    }) as never;
  const service = createMerchantBookingService({
    redis,
    bookings: {
      create: (data) => repository.create(data),
      overlapping: () => Promise.resolve(options.overlap ?? false),
    },
    availability: {
      plan: (input) => {
        plans.push(input);
        return Promise.resolve(plan(input as never));
      },
    },
    catalog: {
      findMany: () =>
        Promise.resolve([{ id: CATALOG, name: { ar: 'قص', en: 'Haircut' } }] as never),
    },
    customers: {
      findByPhone: (e164) =>
        Promise.resolve(
          e164 === E164 && options.account !== undefined ? (options.account as never) : null,
        ),
    },
    members: {
      findById: () => Promise.resolve({ firstName: 'Rana', lastName: 'Haddad' } as never),
    },
    phones: {
      resolve: (phone) =>
        Promise.resolve({
          countryCode: phone.countryCode,
          dialCode: '+962',
          number: phone.number,
          e164: `+962${phone.number}`,
        }),
    },
    settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
    uploads: {
      assertConfirmed: (input) => {
        imageChecks.push(input);
        return Promise.resolve();
      },
    },
    hook: {
      created: (booking) => {
        created.push(booking);
        return Promise.resolve();
      },
    },
    now: () => new Date('2026-11-03T10:00:00Z'),
  });
  return { service, model, plans, created, imageChecks };
};

const person = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Hiba',
  isBride: false,
  serviceIds: [SERVICE],
  start: START,
  ...over,
});
const base = { salonId: SALON, member: { id: MEMBER } };
const ACTIVE = {
  id: id(),
  firstName: 'Noor',
  lastName: 'Saleh',
  gender: 'FEMALE',
  status: 'ACTIVE',
};

describe('customer lookup (§5.20)', () => {
  it('answers registered + first name + gender only for an active account', async () => {
    await expect(rig().service.lookup({ phone: PHONE })).resolves.toEqual({
      registered: false,
      firstName: null,
      gender: null,
    });
    await expect(rig({ account: ACTIVE }).service.lookup({ phone: PHONE })).resolves.toEqual({
      registered: true,
      firstName: 'Noor',
      gender: 'FEMALE',
    });
    await expect(
      rig({ account: { ...ACTIVE, status: 'BLOCKED' } }).service.lookup({ phone: PHONE }),
    ).resolves.toEqual({ registered: true, firstName: null, gender: null });
  });
});

describe('booking for a customer without the app (§5.20)', () => {
  it('needs a name and a gender', async () => {
    const t = rig();
    await expect(
      t.service.create({ ...base, customer: { phone: PHONE }, persons: [person()] as never }),
    ).rejects.toMatchObject({
      details: [expect.objectContaining({ field: 'body.customer.name' })],
    });
    await expect(
      t.service.create({
        ...base,
        customer: { phone: PHONE, name: 'Hiba Saleh' },
        persons: [person()] as never,
      }),
    ).rejects.toMatchObject({
      details: [expect.objectContaining({ field: 'body.customer.gender' })],
    });
    expect(t.model.docs).toHaveLength(0);
  });

  it('creates an APPROVED pay-at-the-business booking with the contact, creator and history', async () => {
    const t = rig();
    const result = await t.service.create({
      ...base,
      customer: { phone: PHONE, name: 'Hiba Saleh', gender: 'FEMALE' },
      persons: [person()] as never,
    });
    expect(result).toMatchObject({
      status: 'APPROVED',
      paymentMethod: 'PAY_ON_ARRIVAL',
      paymentStatus: 'PAY_ON_ARRIVAL',
      customerRegistered: false,
      money: { total: '8.000', dueOnline: '0.000', remaining: '8.000' },
    });
    const doc = t.model.docs[0] ?? {};
    expect(doc['customerId']).toBeUndefined();
    expect(doc).toMatchObject({
      source: 'MERCHANT',
      createdBy: { name: 'Rana Haddad' },
      customerContact: {
        name: 'Hiba Saleh',
        phone: { dialCode: '+962', number: '791234567', e164: E164 },
        gender: 'FEMALE',
      },
      closeReminders: { count: 0 },
      statusHistory: [expect.objectContaining({ status: 'APPROVED', actorType: 'MEMBER' })],
    });
    // The main person takes the customer's gender for the audience rule.
    expect(t.plans[0]).toMatchObject({ persons: [{ gender: 'FEMALE' }] });
    expect(t.created).toHaveLength(1);
  });
});

describe('booking for a registered customer (§5.20)', () => {
  it('links the account and uses its name and gender', async () => {
    const t = rig({ account: ACTIVE });
    const result = await t.service.create({
      ...base,
      customer: { phone: PHONE, name: 'Ignored', gender: 'MALE' },
      persons: [person()] as never,
    });
    expect(result.customerRegistered).toBe(true);
    expect(String(t.model.docs[0]?.['customerId'])).toBe(ACTIVE.id);
    expect(t.model.docs[0]).toMatchObject({
      customerContact: { name: 'Noor Saleh', gender: 'FEMALE' },
    });
  });

  it('refuses a blocked account', async () => {
    const t = rig({ account: { ...ACTIVE, status: 'BLOCKED' } });
    await expect(
      t.service.create({ ...base, customer: { phone: PHONE }, persons: [person()] as never }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' });
  });
});

describe('rules shared with the app', () => {
  it('a branch member books their own branch only', async () => {
    const t = rig();
    const own = id();
    await expect(
      t.service.create({
        salonId: SALON,
        member: { id: MEMBER, branchId: own },
        branchId: id(),
        customer: { phone: PHONE, name: 'Hiba', gender: 'FEMALE' },
        persons: [person()] as never,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
    await t.service.create({
      salonId: SALON,
      member: { id: MEMBER, branchId: own },
      customer: { phone: PHONE, name: 'Hiba', gender: 'FEMALE' },
      persons: [person()] as never,
    });
    expect(t.plans[0]).toMatchObject({ branchId: own });
  });

  it('a slot taken meanwhile is 409 SLOT_TAKEN and nothing is stored', async () => {
    const t = rig({ overlap: true });
    await expect(
      t.service.create({
        ...base,
        customer: { phone: PHONE, name: 'Hiba', gender: 'FEMALE' },
        persons: [person()] as never,
      }),
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
    expect(t.model.docs).toHaveLength(0);
    expect(t.created).toHaveLength(0);
  });

  it('design images only at a tattoo studio, checked as this salon’s member uploads (§5.23)', async () => {
    const salon = rig();
    await expect(
      salon.service.create({
        ...base,
        customer: { phone: PHONE, name: 'Hiba', gender: 'FEMALE' },
        persons: [person({ referenceImageKey: 'bookings/reference/a.jpg' })] as never,
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_TYPE_MISMATCH' });
    const studio = rig({ kind: { businessType: 'TATTOO', audience: 'BOTH' } });
    await studio.service.create({
      ...base,
      customer: { phone: PHONE, name: 'Omar', gender: 'MALE' },
      persons: [person({ referenceImageKey: 'bookings/reference/a.jpg' })] as never,
    });
    const accept = studio.imageChecks[0]?.accept;
    expect(accept?.({ ownerType: 'MEMBER', salonId: SALON } as never)).toBe(true);
    expect(accept?.({ ownerType: 'CUSTOMER', ownerId: SALON } as never)).toBe(false);
    expect(studio.model.docs[0]).toMatchObject({
      persons: [{ referenceImageKey: 'bookings/reference/a.jpg' }],
    });
  });
});

describe('claim on registration (§5.20)', () => {
  it('links only the number’s bookings without an account', async () => {
    const model = createFakeModel();
    const repository = new BookingsRepository(model.model as never);
    const contact = (e164: string): object => ({
      name: 'x',
      phone: { dialCode: '+962', number: '1', e164 },
      gender: 'FEMALE',
    });
    const other = new Types.ObjectId();
    model.docs.push(
      { _id: new Types.ObjectId(), customerContact: contact(E164) },
      { _id: new Types.ObjectId(), customerContact: contact(E164), customerId: other },
      { _id: new Types.ObjectId(), customerContact: contact('+962700000000') },
    );
    const customerId = id();
    await createBookingClaims({ bookings: repository, logger }).claim(E164, customerId);
    expect(
      model.docs.map((d) =>
        d['customerId'] instanceof Types.ObjectId ? d['customerId'].toHexString() : null,
      ),
    ).toEqual([customerId, other.toHexString(), null]);
  });

  it('never fails the sign-up', async () => {
    const claims = createBookingClaims({
      bookings: { claimByPhone: () => Promise.reject(new Error('down')) },
      logger,
    });
    await expect(claims.claim(E164, id())).resolves.toBeUndefined();
  });
});
