import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createBookingQueriesService } from '../src/domain/bookings/bookingQueries.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const HOUR = 3_600_000;
const NOW = new Date('2026-10-12T08:00:00Z'); // Monday 11:00 in Amman
const m = {
  bookings: createFakeModel(),
  customers: createFakeModel(),
  members: createFakeModel(),
  salons: createFakeModel(),
};
const id = (): Types.ObjectId => new Types.ObjectId();
const salon1 = id();
const salon2 = id();
const c1 = id();
const c2 = id();
const staffA = id();
const staffB = id();

const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: req.header('x-member') ?? staffA.toHexString(),
    salonId: salon1.toHexString(),
    role: 'MANAGER',
    permissions: (req.header('x-perms') ?? 'BOOKINGS_VIEW_ALL').split(',').filter(Boolean),
  } as never;
  next();
};
const pass: RequestHandler = (_req, _res, next) => {
  next();
};

const app = createApp({
  logger,
  services: {
    bookingQueries: createBookingQueriesService({
      bookings: new BookingsRepository(m.bookings.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      members: new MembersRepository(m.members.model as never),
      salons: new SalonsRepository(m.salons.model as never),
      settings: {
        get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]),
      },
      storage: new FakeStorageProvider(),
      now: () => NOW,
    }),
    salonProfile: { service: undefined as never, guard: [guard] },
    adminGuard: pass,
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});
const tokenOf = (who: Types.ObjectId): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: who.toHexString(), ttlSec: 600 }).token}`;

const refs = {
  b1: 'WAB-ABC234',
  b2: 'WAB-DEF567',
  b3: 'WAB-GHJ789',
  b4: 'WAB-KMN012',
  b5: 'WAB-PQR345',
};
const ids: Record<string, Types.ObjectId> = {};
const book = (
  key: keyof typeof refs,
  over: {
    salon?: Types.ObjectId;
    customer?: Types.ObjectId;
    staff?: Types.ObjectId;
    status: string;
    startInHours: number;
    bride?: boolean;
    payment?: string;
  },
): void => {
  const _id = id();
  ids[key] = _id;
  const start = new Date(NOW.getTime() + over.startInHours * HOUR);
  const end = new Date(start.getTime() + HOUR);
  m.bookings.docs.push({
    _id,
    referenceNumber: refs[key],
    customerId: over.customer ?? c1,
    salonId: over.salon ?? salon1,
    // b2 is a clinic booking (§5.19 bookings filter).
    businessType: key === 'b2' ? 'CLINIC' : 'SALON',
    salonAudience: key === 'b2' ? 'BOTH' : 'FEMALE',
    status: over.status,
    statusHistory: [{ status: 'PENDING', actorType: 'CUSTOMER', at: NOW }],
    persons: [
      {
        name: 'Rana',
        isBride: over.bride ?? false,
        gender: 'FEMALE',
        staffId: over.staff ?? staffA,
        staffSelection: 'ANY',
        start,
        end,
        subtotal: 12_500,
        services: [
          {
            salonServiceId: id(),
            catalogServiceId: id(),
            name: { ar: 'قص', en: 'Cut' },
            price: 12_500,
            durationMinutes: 60,
          },
        ],
      },
    ],
    hasBride: over.bride ?? false,
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: end,
    paymentMethod: 'PAY_ON_ARRIVAL',
    paymentStatus: over.payment ?? 'PAY_ON_ARRIVAL',
    refundStatus: 'NONE',
    policySnapshot: { cancellationWindowHours: 2 },
    money: { total: 12_500, dueOnline: 0, paidOnline: 0, remaining: 12_500, refunded: 0 },
    createdAt: NOW,
  });
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push({ _id: salon1, name: 'Glow Salon' }, { _id: salon2, name: 'Other Place' });
  m.customers.docs.push(
    { _id: c1, firstName: 'Rana', lastName: 'Ahmad', phone: { e164: '+962791111111' } },
    { _id: c2, firstName: 'Lina', lastName: 'Omar', phone: { e164: '+962792222222' } },
  );
  m.members.docs.push(
    {
      _id: staffA,
      firstName: 'Sara',
      lastName: 'K',
      salonId: salon1,
      photoKey: 'members/sara.jpg',
    },
    { _id: staffB, firstName: 'Dina', lastName: 'M', salonId: salon1 },
  );
  book('b1', { status: 'PENDING', startInHours: 24 });
  book('b2', {
    status: 'APPROVED',
    startInHours: 26,
    staff: staffB,
    bride: true,
    payment: 'DEPOSIT_PAID',
  });
  book('b3', { status: 'COMPLETED', startInHours: -24 });
  book('b4', { status: 'APPROVED', startInHours: 4, customer: c2 });
  book('b5', { status: 'APPROVED', startInHours: 48, salon: salon2 });
});

interface Body {
  data: unknown;
  meta?: { total: number; page: number; pageSize: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const refsOf = (res: { body: unknown }): string[] =>
  (bodyOf(res).data as { referenceNumber: string }[]).map((r) => r.referenceNumber);
const merchant = (path: string, perms?: string, member?: Types.ObjectId): request.Test => {
  const req = request(app).get(`/merchant/v1/bookings${path}`).set('Accept-Language', 'en');
  if (perms !== undefined) void req.set('x-perms', perms);
  if (member !== undefined) void req.set('x-member', member.toHexString());
  return req;
};
const customer = (path: string, who = c1): request.Test =>
  request(app)
    .get(`/customer/v1/bookings${path}`)
    .set('Authorization', tokenOf(who))
    .set('Accept-Language', 'en');

describe('customer', () => {
  it('lists upcoming (soonest first) and past bookings, paginated', async () => {
    const upcoming = await customer('');
    expect(refsOf(upcoming)).toEqual([refs.b1, refs.b2, refs.b5]);
    expect(bodyOf(upcoming).meta).toMatchObject({ total: 3, page: 1, pageSize: 10 });
    expect(refsOf(await customer('?tab=PAST'))).toEqual([refs.b3]);
    expect(refsOf(await customer('?pageSize=1&page=2'))).toEqual([refs.b2]);
  });
  it('filters all / salons / clinics and shows the business type on every row (§5.19)', async () => {
    expect(refsOf(await customer('?businessType=CLINIC'))).toEqual([refs.b2]);
    expect(refsOf(await customer('?businessType=SALON'))).toEqual([refs.b1, refs.b5]);
    expect((await customer('?businessType=SPA')).status).toBe(400);
    const rows = bodyOf(await customer('')).data as {
      businessType: string;
      salonAudience: string;
    }[];
    expect(rows.map((r) => r.businessType)).toEqual(['SALON', 'CLINIC', 'SALON']);
    expect(rows[1]?.salonAudience).toBe('BOTH');
  });

  it('hides the customer, shows the salon and staff first names only, never other customers’ bookings', async () => {
    const res = await customer('');
    const row = (
      bodyOf(res).data as {
        salon: { name: string };
        customer: unknown;
        staff: unknown[];
      }[]
    )[0];
    expect(row).toMatchObject({
      salon: { name: 'Glow Salon' },
      customer: null,
      staff: [
        {
          id: staffA.toHexString(),
          name: 'Sara',
          firstName: 'Sara',
          photoUrl: expect.stringContaining('members/sara.jpg') as unknown,
        },
      ],
    });
    // SRV-170: no last name or other private staff data in the customer view.
    expect(JSON.stringify(bodyOf(res).data)).not.toContain('Sara K');
    expect(refsOf(await customer('', c2))).toEqual([refs.b4]);
  });
  it('shows the rejection reason on the list row (S14) and null otherwise (SRV-170)', async () => {
    const rejected = m.bookings.docs.find((b) => b['referenceNumber'] === refs.b1);
    if (rejected === undefined) throw new Error('missing booking');
    rejected['status'] = 'REJECTED';
    rejected['rejection'] = { reasonCode: 'FULLY_BOOKED', reasonText: 'No staff', at: NOW };
    const rows = bodyOf(await customer('?tab=PAST')).data as {
      referenceNumber: string;
      rejection: unknown;
    }[];
    expect(rows.find((r) => r.referenceNumber === refs.b1)?.rejection).toEqual({
      reasonCode: 'FULLY_BOOKED',
      reasonText: 'No staff',
      at: NOW.toISOString(),
    });
    expect(rows.find((r) => r.referenceNumber === refs.b3)?.rejection).toBeNull();
  });
  it('remaining is 0 once final; a COMPLETED booking reports what was paid at the salon (SRV-170)', async () => {
    const moneyOf = async (key: string): Promise<Record<string, string>> =>
      (
        bodyOf(await customer(`/${ids[key]?.toHexString() ?? ''}`)).data as {
          money: Record<string, string>;
        }
      ).money;
    expect(await moneyOf('b1')).toMatchObject({ remaining: '12.500', paidAtSalon: '0.000' });
    expect(await moneyOf('b3')).toMatchObject({
      total: '12.500',
      remaining: '0.000',
      paidAtSalon: '12.500',
    });
    const cancelled = m.bookings.docs.find((b) => b['referenceNumber'] === refs.b2);
    if (cancelled === undefined) throw new Error('missing booking');
    cancelled['status'] = 'CANCELLED_BY_SALON';
    expect(await moneyOf('b2')).toMatchObject({ remaining: '0.000', paidAtSalon: '0.000' });
  });
  it('searches by reference (any spelling) and by salon name', async () => {
    expect(refsOf(await customer('?q=wab%20def567'))).toEqual([refs.b2]);
    expect(refsOf(await customer('?q=glow'))).toEqual([refs.b1, refs.b2]);
    expect(refsOf(await customer('?q=nothing'))).toEqual([]);
  });
  it('returns the detail in the request language, with money and history', async () => {
    const res = await customer(`/${ids['b2']?.toHexString() ?? ''}`);
    expect(res.status).toBe(200);
    const data = bodyOf(res).data as {
      persons: { services: { name: string; price: string }[]; staff: unknown }[];
      money: { total: string };
      statusHistory: unknown[];
      actions: string[];
    };
    expect(data.persons[0]?.services[0]).toMatchObject({ name: 'Cut', price: '12.500' });
    // SRV-170: each person's staff, first name only (S15, S18 staff rating).
    expect(data.persons[0]?.staff).toEqual({
      id: staffB.toHexString(),
      name: 'Dina',
      firstName: 'Dina',
      photoUrl: null,
    });
    expect(data.money.total).toBe('12.500');
    expect(data.statusHistory).toHaveLength(1);
    expect(data.actions).toEqual([]);
  });
  it('answers 404 for someone else’s booking, 400 for a bad id, 401 without a token', async () => {
    expect((await customer(`/${ids['b4']?.toHexString() ?? ''}`)).status).toBe(404);
    expect((await customer('/nope')).status).toBe(400);
    expect((await request(app).get('/customer/v1/bookings')).status).toBe(401);
  });
});

describe('merchant', () => {
  it('lists the tabs', async () => {
    expect(refsOf(await merchant('?tab=PENDING'))).toEqual([refs.b1]);
    expect(refsOf(await merchant('?tab=UPCOMING'))).toEqual([refs.b4, refs.b1, refs.b2]);
    expect(refsOf(await merchant('?tab=TODAY'))).toEqual([refs.b4]);
    expect(refsOf(await merchant('?tab=PAST'))).toEqual([refs.b3]);
  });
  it('never shows another salon’s bookings; rows carry customer and staff, not the salon', async () => {
    const res = await merchant('');
    expect(refsOf(res)).not.toContain(refs.b5);
    expect((bodyOf(res).data as { salon: unknown }[])[0]?.salon).toBeNull();
    const row = (
      bodyOf(await merchant('?tab=PENDING')).data as { customer: unknown; staff: unknown }[]
    )[0];
    expect(row).toMatchObject({
      customer: { name: 'Rana Ahmad', phone: '+962791111111' },
      staff: [{ name: 'Sara K', firstName: 'Sara' }],
      rejection: null,
    });
  });
  it('searches by customer name, phone and reference', async () => {
    expect(refsOf(await merchant('?q=rana'))).toEqual([refs.b3, refs.b1, refs.b2]);
    expect(refsOf(await merchant('?q=792222'))).toEqual([refs.b4]);
    expect(refsOf(await merchant('?q=WAB-KMN012'))).toEqual([refs.b4]);
  });
  it('SRV-172: q finds a partial reference (merchant E2E #3), never another salon', async () => {
    // The code without the prefix, as the merchant tester typed it (`46512N` for `WAB-46512N`).
    expect(refsOf(await merchant('?q=KMN012'))).toEqual([refs.b4]);
    expect(refsOf(await merchant('?q=kmn0'))).toEqual([refs.b4]);
    expect(refsOf(await merchant('?q=wab-def'))).toEqual([refs.b2]);
    // b5 belongs to another salon: its full or partial reference finds nothing here.
    expect(refsOf(await merchant('?q=PQR345'))).toEqual([]);
    expect(refsOf(await merchant('?q=pqr'))).toEqual([]);
  });
  it('filters by staff, status, bride, payment and dates', async () => {
    expect(refsOf(await merchant(`?staffId=${staffB.toHexString()}`))).toEqual([refs.b2]);
    expect(refsOf(await merchant('?status=COMPLETED,PENDING'))).toEqual([refs.b3, refs.b1]);
    expect(refsOf(await merchant('?brideOnly=true'))).toEqual([refs.b2]);
    expect(refsOf(await merchant('?paymentStatus=DEPOSIT_PAID'))).toEqual([refs.b2]);
    expect(refsOf(await merchant('?from=2026-10-13&to=2026-10-13'))).toEqual([refs.b1, refs.b2]);
  });
  it('BOOKINGS_VIEW_OWN sees only bookings assigned to the member', async () => {
    expect(refsOf(await merchant('', 'BOOKINGS_VIEW_OWN', staffA))).toEqual([
      refs.b3,
      refs.b4,
      refs.b1,
    ]);
    expect(
      (await merchant(`/${ids['b2']?.toHexString() ?? ''}`, 'BOOKINGS_VIEW_OWN', staffA)).status,
    ).toBe(404);
    expect(
      (await merchant(`/${ids['b1']?.toHexString() ?? ''}`, 'BOOKINGS_VIEW_OWN', staffA)).status,
    ).toBe(200);
  });
  it('needs a view permission', async () => {
    expect((await merchant('', 'BOOKINGS_RESPOND')).status).toBe(403);
    expect(
      (await merchant('/calendar?from=2026-10-12&to=2026-10-12', 'BOOKINGS_RESPOND')).status,
    ).toBe(403);
  });
  it('detail lists what the member may do now', async () => {
    const actions = async (key: string, perms: string): Promise<string[]> =>
      (
        bodyOf(await merchant(`/${ids[key]?.toHexString() ?? ''}`, perms)).data as {
          actions: string[];
        }
      ).actions;
    expect(await actions('b1', 'BOOKINGS_VIEW_ALL,BOOKINGS_RESPOND')).toEqual([
      'APPROVE',
      'REJECT',
    ]);
    expect(await actions('b1', 'BOOKINGS_VIEW_ALL')).toEqual([]);
    expect(await actions('b2', 'BOOKINGS_VIEW_ALL,BOOKINGS_OPERATE')).toEqual([
      'CANCEL',
      'REASSIGN',
    ]);
    expect(await actions('b3', 'BOOKINGS_VIEW_ALL,BOOKINGS_OPERATE')).toEqual([]);
  });
  it('detail shows the staff of each person and the customer phone', async () => {
    const data = bodyOf(await merchant(`/${ids['b2']?.toHexString() ?? ''}`)).data as {
      persons: { staff: { name: string } }[];
      customer: { phone: string };
    };
    expect(data.persons[0]?.staff.name).toBe('Dina M');
    expect(data.customer.phone).toBe('+962791111111');
  });
});

describe('calendar', () => {
  const blocks = async (
    query: string,
    perms?: string,
    member?: Types.ObjectId,
  ): Promise<{ bookingId: string; staffId: string }[]> =>
    bodyOf(await merchant(`/calendar?${query}`, perms, member)).data as {
      bookingId: string;
      staffId: string;
    }[];
  it('returns the blocks of the days asked for, soonest first', async () => {
    const found = await blocks('from=2026-10-12&to=2026-10-13');
    expect(found.map((b) => b.bookingId)).toEqual(
      [ids['b4'], ids['b1'], ids['b2']].map((x) => x?.toHexString()),
    );
  });
  it('filters by staff and limits VIEW_OWN to the member’s own column', async () => {
    const byStaff = await blocks(`from=2026-10-12&to=2026-10-13&staffId=${staffB.toHexString()}`);
    expect(byStaff.map((b) => b.staffId)).toEqual([staffB.toHexString()]);
    const own = await blocks('from=2026-10-12&to=2026-10-13', 'BOOKINGS_VIEW_OWN', staffA);
    expect(own.every((b) => b.staffId === staffA.toHexString())).toBe(true);
  });
  it('leaves out other statuses and other days', async () => {
    m.bookings.docs.push({ ...m.bookings.docs[0], _id: id(), status: 'REJECTED' });
    expect(await blocks('from=2026-10-12&to=2026-10-12')).toHaveLength(1);
  });
  it('rejects a reversed range, more than 7 days, and bad dates', async () => {
    expect((await merchant('/calendar?from=2026-10-13&to=2026-10-12')).status).toBe(400);
    expect((await merchant('/calendar?from=2026-10-01&to=2026-10-08')).status).toBe(400);
    expect((await merchant('/calendar?from=2026-02-30&to=2026-03-01')).status).toBe(400);
    expect((await merchant('/calendar?from=2026-10-12&to=2026-10-18')).status).toBe(200);
  });
});

describe('admin', () => {
  const admin = (path: string): request.Test => request(app).get(`/admin/v1/bookings${path}`);
  it('lists every salon, with salon and customer, 25 per page', async () => {
    const res = await admin('?tab=UPCOMING');
    expect(refsOf(res)).toEqual([refs.b4, refs.b1, refs.b2, refs.b5]);
    expect(bodyOf(res).meta?.pageSize).toBe(25);
    const row = (bodyOf(res).data as { salon: { name: string }; customer: { name: string } }[])[3];
    expect(row).toMatchObject({ salon: { name: 'Other Place' }, customer: { name: 'Rana Ahmad' } });
  });
  it('filters by salon, customer and status', async () => {
    expect(refsOf(await admin(`?salonId=${salon2.toHexString()}`))).toEqual([refs.b5]);
    expect(refsOf(await admin(`?customerId=${c2.toHexString()}`))).toEqual([refs.b4]);
    expect(refsOf(await admin('?status=COMPLETED'))).toEqual([refs.b3]);
  });
  it('filters by business type (§5.19)', async () => {
    expect(refsOf(await admin('?tab=UPCOMING&businessType=CLINIC'))).toEqual([refs.b2]);
    expect(refsOf(await admin('?tab=UPCOMING&businessType=SALON'))).not.toContain(refs.b2);
    expect((await admin('?businessType=SPA')).status).toBe(400);
  });
  it('SRV-171 S5: q finds full and partial references, with or without the prefix', async () => {
    expect(refsOf(await admin('?q=PQR345'))).toEqual([refs.b5]);
    expect(refsOf(await admin('?q=pqr'))).toEqual([refs.b5]);
    expect(refsOf(await admin('?q=wab-kmn0'))).toEqual([refs.b4]);
    expect(refsOf(await admin('?q=WAB-PQR345'))).toEqual([refs.b5]);
    // Too short for a reference and no customer with that name: nothing, not everything.
    expect(refsOf(await admin('?q=PQ'))).toEqual([]);
    // Regex characters are taken literally.
    expect(refsOf(await admin('?q=.*'))).toEqual([]);
  });
  it('returns details and 404 for an unknown booking', async () => {
    expect((await admin(`/${ids['b5']?.toHexString() ?? ''}`)).status).toBe(200);
    expect((await admin(`/${id().toHexString()}`)).status).toBe(404);
  });
});
