import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAccountLifecycleService } from '../src/domain/auth/accountLifecycle.service';
import { createAdminCustomersService } from '../src/domain/customers/adminCustomers.service';
import { requireAuth } from '../src/middlewares/auth';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import {
  CustomersRepository,
  InstallationsRepository,
} from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const m = {
  customers: createFakeModel(),
  installations: createFakeModel(),
  bookings: createFakeModel(),
};
const audits: Record<string, unknown>[] = [];
const audit = {
  record: (entry: Record<string, unknown>) => {
    audits.push(entry);
    return Promise.resolve();
  },
} as never;
const customers = new CustomersRepository(m.customers.model as never);
const installations = new InstallationsRepository(m.installations.model as never);
const revoked: string[] = [];
const lifecycle = createAccountLifecycleService({
  customers,
  members: {} as never,
  installations,
  refreshTokens: {
    revokeAll: (_t: string, id: string) => {
      revoked.push(id);
      return Promise.resolve(0);
    },
  } as never,
  storage: {} as never,
  audit,
  access: { accessRevoked: () => Promise.resolve() },
  settings: { get: () => Promise.resolve(30) } as never,
  logger,
});
const service = createAdminCustomersService({
  customers,
  installations,
  bookings: new BookingsRepository(m.bookings.model as never),
  lifecycle,
  audit,
});
const guard = requireAuth('admin', SECRET);
const app = createApp({ logger, services: { adminCustomers: service, adminGuard: guard } });
const adminId = new Types.ObjectId().toHexString();
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;

interface Body {
  data: Record<string, unknown> & { length?: number };
  meta?: { total: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const city = new Types.ObjectId();
const add = (over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  m.customers.docs.push({
    _id,
    firstName: 'Rana',
    lastName: 'Saleh',
    email: 'r@example.com',
    gender: 'FEMALE',
    phone: { e164: `+96279${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}` },
    cityId: city,
    areaId: new Types.ObjectId(),
    language: 'ar',
    pushEnabled: true,
    status: 'ACTIVE',
    createdAt: new Date(),
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  revoked.length = 0;
});

describe('admin customers', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/customers')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/customers').set('Authorization', token('CUSTOMER')))
        .status,
    ).toBe(403);
  });

  it('lists with filters, search and booking counts', async () => {
    const a = add({ firstName: 'Lina', phone: { e164: '+962791111111' } });
    add({ firstName: 'Omar', gender: 'MALE', status: 'BLOCKED' });
    m.bookings.docs.push({ _id: new Types.ObjectId(), customerId: new Types.ObjectId(a) });
    const all = await request(app).get('/admin/v1/customers').set('Authorization', token());
    expect(bodyOf(all).meta?.total).toBe(2);
    const byName = await request(app)
      .get('/admin/v1/customers?q=lin')
      .set('Authorization', token());
    expect(bodyOf(byName).data).toHaveLength(1);
    expect(bodyOf(byName).data[0]).toMatchObject({ bookingsCount: 1, status: 'ACTIVE' });
    const byPhone = await request(app)
      .get('/admin/v1/customers?q=791111')
      .set('Authorization', token());
    expect(bodyOf(byPhone).data).toHaveLength(1);
    const blocked = await request(app)
      .get('/admin/v1/customers?status=BLOCKED&gender=MALE')
      .set('Authorization', token());
    expect(bodyOf(blocked).data).toHaveLength(1);
    expect(
      (await request(app).get('/admin/v1/customers?status=NOPE').set('Authorization', token()))
        .status,
    ).toBe(400);
  });

  it('shows the detail with devices and the journey id; unknown is 404', async () => {
    const id = add();
    m.installations.docs.push({
      _id: new Types.ObjectId(),
      customerId: new Types.ObjectId(id),
      app: 'CUSTOMER',
      platform: 'IOS',
      appVersion: '1.2.0',
      fcmToken: 'x',
      lastSeenAt: new Date(),
    });
    const res = await request(app).get(`/admin/v1/customers/${id}`).set('Authorization', token());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({ journeyUserId: id, email: 'r@example.com' });
    expect(bodyOf(res).data['devices']).toHaveLength(1);
    expect(
      (
        await request(app)
          .get(`/admin/v1/customers/${new Types.ObjectId().toHexString()}`)
          .set('Authorization', token())
      ).status,
    ).toBe(404);
  });

  it('blocks and unblocks with a reason, auditing both and ending sessions', async () => {
    const id = add();
    const noReason = await request(app)
      .post(`/admin/v1/customers/${id}/block`)
      .set('Authorization', token())
      .send({});
    expect(noReason.status).toBe(400);
    const blocked = await request(app)
      .post(`/admin/v1/customers/${id}/block`)
      .set('Authorization', token())
      .send({ reason: 'abuse' });
    expect(blocked.status).toBe(200);
    expect(m.customers.docs[0]?.['status']).toBe('BLOCKED');
    expect(revoked).toEqual([id]);
    const back = await request(app)
      .post(`/admin/v1/customers/${id}/unblock`)
      .set('Authorization', token())
      .send({ reason: 'appeal' });
    expect(back.status).toBe(200);
    expect(m.customers.docs[0]?.['status']).toBe('ACTIVE');
    expect(audits.map((a) => a['action'])).toEqual(['CUSTOMER_BLOCK', 'CUSTOMER_UNBLOCK']);
  });

  it('deletes into the grace period (audited) and restores within it', async () => {
    const id = add();
    const del = await request(app)
      .post(`/admin/v1/customers/${id}/delete`)
      .set('Authorization', token())
      .send({ reason: 'request by phone' });
    expect(del.status).toBe(200);
    expect(bodyOf(del).data['deletionScheduledAt']).toEqual(expect.any(String));
    expect(m.customers.docs[0]?.['status']).toBe('DELETION_PENDING');
    const again = await request(app)
      .post(`/admin/v1/customers/${id}/delete`)
      .set('Authorization', token())
      .send({ reason: 'twice' });
    expect(again.status).toBe(409);
    const restored = await request(app)
      .post(`/admin/v1/customers/${id}/restore`)
      .set('Authorization', token())
      .send({ reason: 'changed mind' });
    expect(restored.status).toBe(200);
    expect(m.customers.docs[0]?.['status']).toBe('ACTIVE');
    expect(m.customers.docs[0]?.['deletionScheduledAt']).toBeUndefined();
    expect(audits.map((a) => a['action'])).toEqual(['CUSTOMER_DELETE', 'CUSTOMER_RESTORE']);
    const notPending = await request(app)
      .post(`/admin/v1/customers/${id}/restore`)
      .set('Authorization', token())
      .send({ reason: 'x' });
    expect(notPending.status).toBe(409);
  });
});
