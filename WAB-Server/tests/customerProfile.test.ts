import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createCustomerProfileService } from '../src/domain/customers/customerProfile.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { CustomersRepository } from '../src/repositories/identity.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';
import { fileSlotsKit } from './helpers/fileSlots';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const m = {
  customers: createFakeModel(),
  cities: createFakeModel(),
  areas: createFakeModel(),
};
const storage = new FakeStorageProvider();
const kit = fileSlotsKit(storage);
const deletions: string[] = [];
const app = createApp({
  logger,
  services: {
    customerProfile: createCustomerProfileService({
      customers: new CustomersRepository(m.customers.model as never),
      cities: new CitiesRepository(m.cities.model as never),
      areas: new AreasRepository(m.areas.model as never),
      files: kit.slots,
      storage,
      lifecycle: {
        requestCustomerDeletion: ({ customerId }) => {
          deletions.push(customerId);
          return Promise.resolve({ deletionScheduledAt: new Date('2026-11-11T00:00:00Z') });
        },
      },
      logger,
    }),
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

interface Body {
  data: Record<string, unknown>;
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const me = id();
const cityA = id();
const cityB = id();
const areaA = id();
const areaB = id();
const token = (): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: me.toHexString(), ttlSec: 600 }).token}`;
const call = (method: 'get' | 'patch' | 'put' | 'delete', path = '', body?: object): request.Test =>
  request(app)[method](`/customer/v1/profile${path}`).set('Authorization', token()).send(body);
const customer = (): Record<string, unknown> | undefined => m.customers.docs[0];
const setStatus = (status: string): void => {
  for (const doc of m.customers.docs) doc['status'] = status;
};
const setAvatar = (key: string): void => {
  for (const doc of m.customers.docs) doc['avatarKey'] = key;
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  kit.uploadsModel.docs.length = 0;
  kit.cleanupsModel.docs.length = 0;
  deletions.length = 0;
  m.customers.docs.push({
    _id: me,
    firstName: 'Noor',
    lastName: 'Khalil',
    email: 'noor@example.com',
    gender: 'FEMALE',
    phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: '+962791234567' },
    cityId: cityA,
    areaId: areaA,
    language: 'ar',
    pushEnabled: true,
    status: 'ACTIVE',
  });
  m.cities.docs.push({ _id: cityA, active: true }, { _id: cityB, active: true });
  m.areas.docs.push(
    { _id: areaA, cityId: cityA, active: true },
    { _id: areaB, cityId: cityB, active: true },
  );
});

describe('GET /customer/v1/profile', () => {
  it('returns my data without internal fields, avatar as a URL', async () => {
    const res = await call('get');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      firstName: 'Noor',
      phone: { e164: '+962791234567' },
      avatarUrl: null,
      pushEnabled: true,
    });
    expect(JSON.stringify(res.body)).not.toContain('status');
  });

  it('needs a customer token; blocked and removed accounts are refused', async () => {
    expect((await request(app).get('/customer/v1/profile')).status).toBe(401);
    setStatus('BLOCKED');
    const blocked = await call('get');
    expect(blocked.status).toBe(403);
    expect(bodyOf(blocked).error.code).toBe('ACCOUNT_BLOCKED');
    setStatus('DELETED');
    expect((await call('get')).status).toBe(404);
  });
});

describe('PATCH /customer/v1/profile', () => {
  it('changes only the sent fields', async () => {
    const res = await call('patch', '', { firstName: ' Lina ', gender: 'MALE', language: 'en' });
    expect(res.status).toBe(200);
    expect(customer()).toMatchObject({
      firstName: 'Lina',
      lastName: 'Khalil',
      gender: 'MALE',
      language: 'en',
      email: 'noor@example.com',
    });
  });

  it('moves to another city and area together; an area of another city is refused', async () => {
    expect(
      (await call('patch', '', { cityId: cityB.toHexString(), areaId: areaB.toHexString() }))
        .status,
    ).toBe(200);
    expect(String(customer()?.['cityId'])).toBe(cityB.toHexString());
    const bad = await call('patch', '', { areaId: areaA.toHexString() });
    expect(bad.status).toBe(400);
    expect(bodyOf(bad).error.details.map((d) => d.field)).toEqual(['body.areaId']);
  });

  it('refuses unknown or inactive places', async () => {
    for (const doc of m.cities.docs) doc['active'] = false;
    const res = await call('patch', '', {
      cityId: cityB.toHexString(),
      areaId: areaB.toHexString(),
    });
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain('body.cityId');
  });

  it.each([
    ['an invalid email', { email: 'nope' }],
    ['a blank name', { firstName: ' ' }],
    ['an unknown gender', { gender: 'X' }],
    ['an unknown language', { language: 'fr' }],
    ['a bad id', { cityId: 'x' }],
  ])('rejects %s', async (_n, body) => {
    expect((await call('patch', '', body)).status).toBe(400);
  });

  it('ignores a phone sent by the client (OTP flow only) and an empty patch changes nothing', async () => {
    const res = await call('patch', '', { phone: '+962700000000' });
    expect(res.status).toBe(200);
    expect(customer()?.['phone']).toMatchObject({ e164: '+962791234567' });
  });
});

describe('avatar', () => {
  const mine = { purpose: 'CUSTOMER_AVATAR', ownerType: 'CUSTOMER', ownerId: me.toHexString() } as const;
  const slotKey = (): string => `customers/${me.toHexString()}/profile/avatar`;

  it('replaces the photo in its slot (same key, new version) and queues the old files', async () => {
    storage.simulateUpload('customers/a/old.jpg', { contentType: 'image/jpeg', size: 10 });
    setAvatar('customers/a/old.jpg');
    await kit.confirmed('customers/a/new.jpg', mine);
    const res = await call('put', '/avatar', { key: 'customers/a/new.jpg' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['avatarUrl']).toContain(`${slotKey()}?v=1`);
    expect(customer()?.['avatarKey']).toBe(`${slotKey()}?v=1`);
    expect(kit.queued()).toEqual(expect.arrayContaining(['customers/a/new.jpg', 'customers/a/old.jpg']));
    await kit.cleanup.drain();
    expect(storage.has('customers/a/old.jpg')).toBe(false);
    expect(storage.has(slotKey())).toBe(true);
    await kit.confirmed('customers/a/newer.jpg', mine);
    const again = await call('put', '/avatar', { key: 'customers/a/newer.jpg' });
    expect(bodyOf(again).data['avatarUrl']).toContain(`${slotKey()}?v=2`);
    expect(kit.uploadsModel.docs.filter((d) => d['key'] === slotKey())).toHaveLength(1);
  });

  it('refuses a key that was never confirmed for this customer', async () => {
    const res = await call('put', '/avatar', { key: 'customers/a/none.jpg' });
    expect(res.status).toBe(400);
    expect(customer()?.['avatarKey']).toBeUndefined();
    await kit.confirmed('customers/b/theirs.jpg', { ...mine, ownerId: id().toHexString() });
    expect((await call('put', '/avatar', { key: 'customers/b/theirs.jpg' })).status).toBe(400);
  });

  it('deletes the photo and its file; deleting twice is fine', async () => {
    await kit.confirmed('customers/a/p.jpg', mine);
    await call('put', '/avatar', { key: 'customers/a/p.jpg' });
    const res = await call('delete', '/avatar');
    expect(bodyOf(res).data['avatarUrl']).toBeNull();
    expect(customer()?.['avatarKey']).toBeUndefined();
    await kit.cleanup.drain();
    expect(storage.has(slotKey())).toBe(false);
    expect((await call('delete', '/avatar')).status).toBe(200);
  });
});

describe('DELETE /customer/v1/profile', () => {
  it('starts the grace period through the lifecycle service', async () => {
    const res = await call('delete');
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['deletionScheduledAt']).toBe('2026-11-11T00:00:00.000Z');
    expect(deletions).toEqual([me.toHexString()]);
  });

  it('is refused for a blocked account', async () => {
    setStatus('BLOCKED');
    expect((await call('delete')).status).toBe(403);
    expect(deletions).toHaveLength(0);
  });
});
