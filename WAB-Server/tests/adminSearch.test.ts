import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminSearchService } from '../src/domain/adminSearch/adminSearch.service';
import { requireAuth } from '../src/middlewares/auth';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { escapeRegex } from '../src/utils/format/regex';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const REFERENCE = 'WAB-7K3M9Q';
const salonId = new Types.ObjectId();
const customerId = new Types.ObjectId();

const m = {
  customers: createFakeModel(),
  salons: createFakeModel(),
  members: createFakeModel(),
  bookings: createFakeModel(),
};
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminSearch: createAdminSearchService({
      customers: new CustomersRepository(m.customers.model as never),
      salons: new SalonsRepository(m.salons.model as never),
      members: new MembersRepository(m.members.model as never),
      bookings: new BookingsRepository(m.bookings.model as never),
    }),
  },
});
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`;

interface Group {
  items: Record<string, unknown>[];
  total: number;
}
interface Body {
  data: {
    customers?: Group;
    salons?: Group;
    bookings?: Group;
    members?: Group;
    page: number;
    pageSize: number;
  };
  error?: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const search = (query: Record<string, string>): Promise<{ status: number; body: unknown }> =>
  request(app).get('/admin/v1/search').query(query).set('Authorization', token());

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  m.customers.docs.push(
    {
      _id: customerId,
      firstName: 'Layla',
      lastName: 'Haddad',
      status: 'ACTIVE',
      phone: { number: '786135059', e164: '+962786135059' },
      createdAt: new Date('2026-10-01'),
    },
    {
      _id: new Types.ObjectId(),
      firstName: 'Omar',
      lastName: 'Layla-Nasser',
      status: 'BLOCKED',
      phone: { number: '791112233', e164: '+962791112233' },
      createdAt: new Date('2026-10-02'),
    },
  );
  m.salons.docs.push(
    {
      _id: salonId,
      name: 'Layla Beauty',
      businessType: 'SALON',
      audience: 'FEMALE',
      state: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Gents Cut',
      businessType: 'SALON',
      audience: 'MALE',
      state: 'ACTIVE',
      createdAt: new Date(),
    },
  );
  m.members.docs.push({
    _id: new Types.ObjectId(),
    salonId,
    firstName: 'Rana',
    lastName: 'Said',
    phone: '+962770001122',
    role: 'OWNER',
    active: true,
    createdAt: new Date(),
  });
  m.bookings.docs.push({
    _id: new Types.ObjectId(),
    referenceNumber: REFERENCE,
    status: 'PENDING',
    appointmentStart: new Date('2026-11-01T10:00:00Z'),
    salonId,
    customerId,
    createdAt: new Date(),
  });
});

describe('admin global search', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/search?q=ab')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/search?q=ab').set('Authorization', token('CUSTOMER')))
        .status,
    ).toBe(403);
  });

  it('finds the same name in customers and salons, grouped, with totals', async () => {
    const res = await search({ q: 'layla' });
    expect(res.status).toBe(200);
    const { data } = bodyOf(res);
    expect(data.customers?.total).toBe(2);
    expect(data.salons?.items.map((s) => s['name'])).toEqual(['Layla Beauty']);
    expect(data.bookings?.total).toBe(0);
    expect(data.members?.total).toBe(0);
    expect(data.page).toBe(1);
  });

  it('finds customers and members by phone: national number, with a zero, or with the dial code', async () => {
    for (const q of ['786135059', '0786135059', '962786135059', '+962 78 613 5059']) {
      const found = bodyOf(await search({ q, types: 'customers' })).data.customers;
      expect(found?.items.map((c) => c['phone'])).toEqual(['+962786135059']);
    }
    const member = bodyOf(await search({ q: '770001122', types: 'members' })).data.members;
    expect(member?.items[0]).toMatchObject({ name: 'Rana Said', role: 'OWNER', active: true });
  });

  it('finds a booking by its reference, in any letter case and spacing', async () => {
    const found = bodyOf(await search({ q: REFERENCE.toLowerCase(), types: 'bookings' })).data
      .bookings;
    expect(found?.items).toHaveLength(1);
    expect(found?.items[0]).toMatchObject({ referenceNumber: REFERENCE, status: 'PENDING' });
  });

  it('returns only the requested groups', async () => {
    const { data } = bodyOf(await search({ q: 'layla', types: 'salons, customers' }));
    expect(Object.keys(data).sort()).toEqual(['customers', 'page', 'pageSize', 'salons']);
  });

  it('paginates each group', async () => {
    const first = bodyOf(await search({ q: 'layla', types: 'customers', pageSize: '1' })).data;
    expect(first.customers?.items).toHaveLength(1);
    expect(first.customers?.total).toBe(2);
    const second = bodyOf(
      await search({ q: 'layla', types: 'customers', pageSize: '1', page: '2' }),
    ).data;
    expect(second.customers?.items[0]?.['id']).not.toBe(first.customers?.items[0]?.['id']);
  });

  it('treats the text as a literal: a pattern matches nothing', async () => {
    const { data } = bodyOf(await search({ q: '.*' }));
    expect(data.customers?.total).toBe(0);
    expect(data.salons?.total).toBe(0);
    expect(data.members?.total).toBe(0);
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
  });

  it('refuses a missing, too short or too long query and unknown groups', async () => {
    expect((await search({})).status).toBe(400);
    expect((await search({ q: 'a' })).status).toBe(400);
    expect((await search({ q: ' a ' })).status).toBe(400);
    expect((await search({ q: 'x'.repeat(101) })).status).toBe(400);
    expect((await search({ q: 'layla', types: 'salons,nope' })).status).toBe(400);
    expect((await search({ q: 'layla', pageSize: '0' })).status).toBe(400);
  });

  it('an unknown reference gives an empty bookings group, never everything', async () => {
    const found = bodyOf(await search({ q: 'zzzz', types: 'bookings' })).data.bookings;
    expect(found).toEqual({ items: [], total: 0 });
  });
});
