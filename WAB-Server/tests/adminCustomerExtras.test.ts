import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { createAdminCustomerExtrasService } from '../src/domain/customers/adminCustomerExtras.service';
import { createAccountLifecycleService } from '../src/domain/auth/accountLifecycle.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { requireAuth } from '../src/middlewares/auth';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import {
  CustomersRepository,
  InstallationsRepository,
} from '../src/repositories/identity.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const REASON = 'Support ticket 4411';
const adminId = new Types.ObjectId().toHexString();
const cityId = new Types.ObjectId();
const otherCity = new Types.ObjectId();
const areaId = new Types.ObjectId();

const m = {
  customers: createFakeModel(),
  installations: createFakeModel(),
  notifications: createFakeModel(),
  audit: createFakeModel(),
  cities: createFakeModel([
    { _id: cityId, active: true },
    { _id: otherCity, active: true },
  ]),
  areas: createFakeModel([{ _id: areaId, cityId, active: true }]),
};
const revoked: string[] = [];
const sockets: { scope: string; id: string }[] = [];
const reviewCalls: Record<string, unknown>[] = [];
const campaignCalls: Record<string, unknown>[] = [];
const audit = createAuditWriter(new AuditLogsRepository(m.audit.model as never));
const customers = new CustomersRepository(m.customers.model as never);
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminCustomerExtras: createAdminCustomerExtrasService({
      customers,
      cities: new CitiesRepository(m.cities.model as never),
      areas: new AreasRepository(m.areas.model as never),
      reviews: {
        list: (input) => {
          reviewCalls.push(input);
          return Promise.resolve({ items: [], total: 0 });
        },
      },
      notifications: new NotificationsRepository(m.notifications.model as never),
      campaigns: {
        create: (input) => {
          campaignCalls.push(input);
          return Promise.resolve({
            id: 'c1',
            status: 'SENDING',
            scheduledAt: new Date('2026-10-12T08:00:00Z'),
          } as never);
        },
      },
      lifecycle: createAccountLifecycleService({
        customers,
        members: {} as never,
        installations: new InstallationsRepository(m.installations.model as never),
        refreshTokens: {
          revokeAll: (_t: string, id: string) => {
            revoked.push(id);
            return Promise.resolve(0);
          },
        } as never,
        files: { remove: () => Promise.resolve() },
        audit,
        access: {
          accessRevoked: (target) => {
            sockets.push(target);
            return Promise.resolve();
          },
        },
        settings: { get: () => Promise.resolve(30) } as never,
        logger,
      }),
      audit,
    }),
  },
});

interface Body {
  data: Record<string, unknown>;
  meta?: { total: number };
  error?: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const bearer = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  body?: object,
): Promise<{ status: number; body: unknown }> => {
  const req = request(app)[method](`/admin/v1/customers${path}`).set('Authorization', bearer());
  return body === undefined ? req : req.send(body);
};
const addCustomer = (over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  m.customers.docs.push({
    _id,
    firstName: 'Layla',
    lastName: 'Haddad',
    email: 'layla@example.com',
    gender: 'FEMALE',
    status: 'ACTIVE',
    phone: { countryCode: 'JO', dialCode: '+962', number: '786135059', e164: '+962786135059' },
    cityId,
    areaId,
    language: 'ar',
    pushEnabled: true,
    avatarKey: 'customers/a.jpg',
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  m.cities.docs.push({ _id: cityId, active: true }, { _id: otherCity, active: true });
  m.areas.docs.push({ _id: areaId, cityId, active: true });
  revoked.length = 0;
  sockets.length = 0;
  reviewCalls.length = 0;
  campaignCalls.length = 0;
});

describe('admin customer extras: auth', () => {
  it('needs an admin token on every route', async () => {
    const id = addCustomer();
    for (const [method, path] of [
      ['patch', `/${id}`],
      ['get', `/${id}/reviews`],
      ['get', `/${id}/notifications`],
      ['post', `/${id}/push`],
      ['post', `/${id}/force-delete`],
    ] as const) {
      expect((await request(app)[method](`/admin/v1/customers${path}`)).status).toBe(401);
      expect(
        (
          await request(app)
            [method](`/admin/v1/customers${path}`)
            .set('Authorization', bearer('CUSTOMER'))
        ).status,
      ).toBe(403);
    }
  });
});

describe('admin customer extras: edit', () => {
  it('corrects the profile with a reason; audit holds only the changed fields', async () => {
    const id = addCustomer();
    const res = await call('patch', `/${id}`, {
      firstName: 'Laila',
      email: 'laila@example.com',
      reason: REASON,
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      firstName: 'Laila',
      email: 'laila@example.com',
      lastName: 'Haddad',
    });
    expect(m.customers.docs[0]?.['firstName']).toBe('Laila');
    expect(m.audit.docs[0]).toMatchObject({
      action: 'CUSTOMER_EDIT',
      entityType: 'customer',
      entityId: id,
      reason: REASON,
      before: { firstName: 'Layla', email: 'layla@example.com' },
      after: { firstName: 'Laila', email: 'laila@example.com' },
    });
  });

  it('a blocked or pending-deletion customer can be corrected, an anonymized one cannot (409)', async () => {
    const blocked = addCustomer({ status: 'BLOCKED' });
    expect((await call('patch', `/${blocked}`, { lastName: 'Fixed', reason: REASON })).status).toBe(
      200,
    );
    const pending = addCustomer({ status: 'DELETION_PENDING' });
    expect((await call('patch', `/${pending}`, { lastName: 'Fixed', reason: REASON })).status).toBe(
      200,
    );
    const deleted = addCustomer({ status: 'DELETED' });
    expect((await call('patch', `/${deleted}`, { lastName: 'Fixed', reason: REASON })).status).toBe(
      409,
    );
  });

  it('checks the city and area, the reason, the fields and the phone is not editable', async () => {
    const id = addCustomer();
    const wrongCity = await call('patch', `/${id}`, {
      cityId: otherCity.toHexString(),
      areaId: areaId.toHexString(),
      reason: REASON,
    });
    expect(wrongCity.status).toBe(400);
    expect((await call('patch', `/${id}`, { firstName: 'X' })).status).toBe(400);
    expect((await call('patch', `/${id}`, { reason: REASON })).status).toBe(400);
    expect((await call('patch', `/${id}`, { email: 'nope', reason: REASON })).status).toBe(400);
    const phone = await call('patch', `/${id}`, { phone: '+962791112233', reason: REASON });
    expect(phone.status).toBe(400); // only `reason` left: nothing to change
    expect(m.customers.docs[0]?.['phone']).toMatchObject({ e164: '+962786135059' });
    expect(m.audit.docs).toHaveLength(0);
    expect(
      (
        await call('patch', `/${new Types.ObjectId().toHexString()}`, {
          firstName: 'X',
          reason: REASON,
        })
      ).status,
    ).toBe(404);
  });
});

describe('admin customer extras: reviews and notifications', () => {
  it('asks the reviews service for this author only', async () => {
    const id = addCustomer();
    expect((await call('get', `/${id}/reviews?pageSize=5`)).status).toBe(200);
    expect(reviewCalls[0]).toMatchObject({ authorId: id, params: { page: 1, pageSize: 5 } });
    expect((await call('get', `/${new Types.ObjectId().toHexString()}/reviews`)).status).toBe(404);
  });

  it('lists what was sent to the customer, newest first, paginated, and nobody else’s', async () => {
    const id = addCustomer();
    const mine = new Types.ObjectId(id);
    const row = (
      event: string,
      minutes: number,
      over: Record<string, unknown> = {},
    ): Record<string, unknown> => ({
      _id: new Types.ObjectId(),
      recipientType: 'CUSTOMER',
      recipientId: mine,
      type: 'BOOKING',
      event,
      title: { ar: 'ع', en: 'T' },
      body: { ar: 'ن', en: 'B' },
      pushSent: true,
      pushResult: 'SENT',
      createdAt: new Date(Date.UTC(2026, 9, 12, 8, 0) - minutes * 60_000),
      ...over,
    });
    m.notifications.docs.push(
      row('booking.approved', 60),
      row('booking.reminder_1h', 5, {
        readAt: new Date('2026-10-12T08:00:00Z'),
        pushSent: false,
        pushResult: 'PUSH_OFF',
      }),
      row('booking.created', 1, { recipientId: new Types.ObjectId() }),
      row('booking.created', 2, { recipientType: 'MEMBER' }),
    );
    const res = bodyOf(await call('get', `/${id}/notifications`));
    const rows = res.data as unknown as {
      event: string;
      readAt: string | null;
      pushResult: string;
    }[];
    expect(rows.map((r) => r.event)).toEqual(['booking.reminder_1h', 'booking.approved']);
    expect(rows[0]).toMatchObject({ readAt: '2026-10-12T08:00:00.000Z', pushResult: 'PUSH_OFF' });
    expect(rows[1]?.readAt).toBeNull();
    expect(res.meta?.total).toBe(2);
    const second = bodyOf(await call('get', `/${id}/notifications?pageSize=1&page=2`));
    expect((second.data as unknown as { event: string }[])[0]?.event).toBe('booking.approved');
  });
});

describe('admin customer extras: push to one customer', () => {
  const MESSAGE = { title: { ar: 'مرحبا', en: 'Hello' }, body: { ar: 'نص', en: 'Text' } };

  it('sends now through a campaign for exactly this customer', async () => {
    const id = addCustomer();
    const res = await call('post', `/${id}/push`, {
      ...MESSAGE,
      link: '/bookings',
      reason: REASON,
    });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toEqual({
      campaignId: 'c1',
      status: 'SENDING',
      scheduledAt: '2026-10-12T08:00:00.000Z',
    });
    expect(campaignCalls[0]).toMatchObject({
      reason: REASON,
      data: {
        app: 'CUSTOMER',
        audience: { kind: 'SPECIFIC_USERS', customerIds: [id] },
        title: MESSAGE.title,
        body: MESSAGE.body,
        link: '/bookings',
      },
    });
    expect((campaignCalls[0]?.['data'] as Record<string, unknown>)['scheduledAt']).toBeUndefined();
  });

  it('only an ACTIVE account can be pushed (422); bad input is 400; unknown customer 404', async () => {
    for (const status of ['BLOCKED', 'DELETION_PENDING', 'DELETED']) {
      const id = addCustomer({ status });
      const res = await call('post', `/${id}/push`, { ...MESSAGE, reason: REASON });
      expect(res.status).toBe(422);
      expect(bodyOf(res).error?.code).toBe(ERROR_CODES.INVALID_TRANSITION);
    }
    const id = addCustomer();
    expect((await call('post', `/${id}/push`, { ...MESSAGE })).status).toBe(400);
    expect(
      (
        await call('post', `/${id}/push`, {
          title: { ar: 'a' },
          body: MESSAGE.body,
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', `/${id}/push`, {
          ...MESSAGE,
          link: 'javascript:alert(1)',
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', `/${new Types.ObjectId().toHexString()}/push`, {
          ...MESSAGE,
          reason: REASON,
        })
      ).status,
    ).toBe(404);
    expect(campaignCalls).toHaveLength(0);
  });
});

describe('admin customer extras: force delete', () => {
  it.each(['ACTIVE', 'BLOCKED', 'DELETION_PENDING'])(
    'anonymizes a %s customer at once, ends access and audits',
    async (status) => {
      const id = addCustomer({ status });
      const res = await call('post', `/${id}/force-delete`, { reason: REASON });
      expect(res.status).toBe(200);
      expect(m.customers.docs[0]).toMatchObject({
        status: 'DELETED',
        firstName: expect.not.stringContaining('Layla') as string,
        pushEnabled: false,
      });
      expect((m.customers.docs[0]?.['phone'] as { e164: string }).e164).not.toContain('786135059');
      expect(m.customers.docs[0]?.['avatarKey']).toBeUndefined();
      expect(revoked).toEqual([id]);
      expect(sockets).toEqual([{ scope: 'customer', id }]);
      expect(m.audit.docs[0]).toMatchObject({
        action: 'CUSTOMER_FORCE_DELETE',
        reason: REASON,
        before: { status },
        after: { status: 'DELETED' },
      });
    },
  );

  it('an already anonymized customer is 409, an unknown one 404, and a reason is required', async () => {
    const deleted = addCustomer({ status: 'DELETED' });
    expect((await call('post', `/${deleted}/force-delete`, { reason: REASON })).status).toBe(409);
    expect(
      (
        await call('post', `/${new Types.ObjectId().toHexString()}/force-delete`, {
          reason: REASON,
        })
      ).status,
    ).toBe(404);
    const id = addCustomer();
    expect((await call('post', `/${id}/force-delete`, {})).status).toBe(400);
    expect(m.customers.docs.find((c) => String(c['_id']) === id)?.['status']).toBe('ACTIVE');
    expect(m.audit.docs).toHaveLength(0);
  });
});
