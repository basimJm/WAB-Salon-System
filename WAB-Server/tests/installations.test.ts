import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createInstallationService } from '../src/domain/installations/installations.service';
import { requireAuth, optionalAuth } from '../src/middlewares/auth';
import { FakeAnalyticsProvider } from '../src/providers/analytics';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const DEVICE = {
  installationId: 'install-device-0001',
  platform: 'ANDROID',
  appVersion: '1.0.0',
  language: 'ar',
} as const;

interface Rig {
  service: ReturnType<typeof createInstallationService>;
  installations: FakeModel;
  customers: FakeModel;
  members: FakeModel;
  analytics: FakeAnalyticsProvider;
}

const setup = (): Rig => {
  const installations = createFakeModel();
  const customers = createFakeModel();
  const members = createFakeModel();
  const analytics = new FakeAnalyticsProvider();
  const service = createInstallationService({
    installations: new InstallationsRepository(installations.model as never),
    customers: new CustomersRepository(customers.model as never),
    members: new MembersRepository(members.model as never),
    analytics,
    logger,
  });
  return { service, installations, customers, members, analytics };
};

const addCustomer = (rig: Rig, status = 'ACTIVE'): string => {
  const _id = new Types.ObjectId();
  rig.customers.docs.push({ _id, status, pushEnabled: true });
  return _id.toHexString();
};
const addMember = (rig: Rig, active = true): string => {
  const _id = new Types.ObjectId();
  rig.members.docs.push({ _id, active, role: 'EMPLOYEE' });
  return _id.toHexString();
};
const failure = async (promise: Promise<unknown>): Promise<Record<string, unknown>> =>
  await promise.then(
    () => ({}),
    (error: unknown) => error as Record<string, unknown>,
  );
const byId = (rig: Rig, installationId: string): Record<string, unknown> =>
  rig.installations.docs.find((d) => d['installationId'] === installationId) ?? {};

describe('installations: guests', () => {
  it('registers a device without an account and updates it on the next call', async () => {
    const rig = setup();
    const first = await rig.service.register({
      app: 'CUSTOMER',
      device: { ...DEVICE, fcmToken: 'fcm-token-aaaaaaaa', osVersion: '14' },
    });
    expect(first).toEqual({ installationId: DEVICE.installationId, linked: false });
    expect(rig.installations.docs).toHaveLength(1);
    expect(rig.installations.docs[0]).toMatchObject({
      app: 'CUSTOMER',
      platform: 'ANDROID',
      appVersion: '1.0.0',
      language: 'ar',
      fcmToken: 'fcm-token-aaaaaaaa',
      osVersion: '14',
    });
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(rig.installations.docs[0]?.['fcmTokenUpdatedAt']).toBeInstanceOf(Date);
    await rig.service.register({ app: 'CUSTOMER', device: { ...DEVICE, appVersion: '1.1.0' } });
    expect(rig.installations.docs).toHaveLength(1);
    // an update without the optional fields keeps what is stored
    expect(rig.installations.docs[0]).toMatchObject({
      appVersion: '1.1.0',
      fcmToken: 'fcm-token-aaaaaaaa',
      osVersion: '14',
    });
  });

  it('does not unlink a signed-in device when a guest call arrives', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    await rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: id });
    await rig.service.register({ app: 'CUSTOMER', device: DEVICE });
    expect(String(rig.installations.docs[0]?.['customerId'])).toBe(id);
  });
});

describe('installations: signed-in customer', () => {
  it('links the device to the account and joins the analytics history', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const link = jest.spyOn(rig.analytics, 'linkIdentity');
    const result = await rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: id });
    expect(result).toEqual({ installationId: DEVICE.installationId, linked: true });
    expect(String(rig.installations.docs[0]?.['customerId'])).toBe(id);
    expect(link).toHaveBeenCalledWith({
      installationId: DEVICE.installationId,
      actorType: 'CUSTOMER',
      actorId: id,
    });
  });

  it('a second customer on the same device takes the link over', async () => {
    const rig = setup();
    const first = addCustomer(rig);
    const second = addCustomer(rig);
    await rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: first });
    await rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: second });
    expect(rig.installations.docs).toHaveLength(1);
    expect(String(rig.installations.docs[0]?.['customerId'])).toBe(second);
  });

  it.each(['BLOCKED', 'DELETION_PENDING', 'DELETED'])(
    'a %s customer is refused (401)',
    async (status) => {
      const rig = setup();
      const id = addCustomer(rig, status);
      expect(
        await failure(rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: id })),
      ).toMatchObject({ httpStatus: 401 });
      expect(rig.installations.docs).toHaveLength(0);
    },
  );

  it('an unknown customer is refused, and a failing analytics link never breaks the call', async () => {
    const rig = setup();
    expect(
      await failure(
        rig.service.register({
          app: 'CUSTOMER',
          device: DEVICE,
          subjectId: new Types.ObjectId().toHexString(),
        }),
      ),
    ).toMatchObject({ httpStatus: 401 });
    const id = addCustomer(rig);
    jest.spyOn(rig.analytics, 'linkIdentity').mockRejectedValueOnce(new Error('bigquery down'));
    await expect(
      rig.service.register({ app: 'CUSTOMER', device: DEVICE, subjectId: id }),
    ).resolves.toMatchObject({ linked: true });
  });
});

describe('installations: push token ownership', () => {
  it('moves a token to the newest installation and leaves other tokens alone', async () => {
    const rig = setup();
    await rig.service.register({
      app: 'CUSTOMER',
      device: { ...DEVICE, fcmToken: 'shared-token-1' },
    });
    await rig.service.register({
      app: 'CUSTOMER',
      device: { ...DEVICE, installationId: 'install-device-0002', fcmToken: 'other-token-22' },
    });
    await rig.service.register({
      app: 'CUSTOMER',
      device: { ...DEVICE, installationId: 'install-device-0003', fcmToken: 'shared-token-1' },
    });
    expect(byId(rig, 'install-device-0001')['fcmToken']).toBeUndefined();
    expect(byId(rig, 'install-device-0002')['fcmToken']).toBe('other-token-22');
    expect(byId(rig, 'install-device-0003')['fcmToken']).toBe('shared-token-1');
  });

  it('re-sending the same token on the same device keeps it', async () => {
    const rig = setup();
    const device = { ...DEVICE, fcmToken: 'shared-token-1' };
    await rig.service.register({ app: 'CUSTOMER', device });
    await rig.service.register({ app: 'CUSTOMER', device });
    expect(rig.installations.docs[0]?.['fcmToken']).toBe('shared-token-1');
  });
});

describe('installations: merchant members', () => {
  it('links the device to the member as a MERCHANT installation', async () => {
    const rig = setup();
    const id = addMember(rig);
    const link = jest.spyOn(rig.analytics, 'linkIdentity');
    const result = await rig.service.register({ app: 'MERCHANT', device: DEVICE, subjectId: id });
    expect(result.linked).toBe(true);
    expect(rig.installations.docs[0]).toMatchObject({ app: 'MERCHANT' });
    expect(String(rig.installations.docs[0]?.['memberId'])).toBe(id);
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(link).toHaveBeenCalledWith({
      installationId: DEVICE.installationId,
      actorType: 'MEMBER',
      actorId: id,
    });
  });

  it('a deactivated member is refused (MEMBER_INACTIVE) and an unknown one is 401', async () => {
    const rig = setup();
    const id = addMember(rig, false);
    expect(
      await failure(rig.service.register({ app: 'MERCHANT', device: DEVICE, subjectId: id })),
    ).toMatchObject({ code: 'MEMBER_INACTIVE', httpStatus: 403 });
    expect(
      await failure(
        rig.service.register({
          app: 'MERCHANT',
          device: DEVICE,
          subjectId: new Types.ObjectId().toHexString(),
        }),
      ),
    ).toMatchObject({ httpStatus: 401 });
    expect(rig.installations.docs).toHaveLength(0);
  });

  it('customer and merchant installations with the same id are separate records', async () => {
    const rig = setup();
    await rig.service.register({ app: 'CUSTOMER', device: DEVICE });
    await rig.service.register({ app: 'MERCHANT', device: DEVICE, subjectId: addMember(rig) });
    expect(rig.installations.docs.map((d) => d['app']).sort()).toEqual(['CUSTOMER', 'MERCHANT']);
  });
});

describe('installations: push switch', () => {
  it('turns the account-wide switch off and on', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    await rig.service.setPushEnabled({ customerId: id, enabled: false });
    expect(rig.customers.docs[0]?.['pushEnabled']).toBe(false);
    await rig.service.setPushEnabled({ customerId: id, enabled: true });
    expect(rig.customers.docs[0]?.['pushEnabled']).toBe(true);
  });

  it('refuses customers who are not active or do not exist', async () => {
    const rig = setup();
    const blocked = addCustomer(rig, 'BLOCKED');
    expect(
      await failure(rig.service.setPushEnabled({ customerId: blocked, enabled: false })),
    ).toMatchObject({
      httpStatus: 401,
    });
    expect(
      await failure(
        rig.service.setPushEnabled({
          customerId: new Types.ObjectId().toHexString(),
          enabled: false,
        }),
      ),
    ).toMatchObject({ httpStatus: 401 });
  });
});

describe('installations: HTTP', () => {
  interface Body {
    success: boolean;
    data: { installationId?: string; linked?: boolean } | null;
    error: { code: string; details: { field: string }[] };
  }
  const bodyOf = (res: { body: unknown }): Body => res.body as Body;
  const appFor = (rig: Rig): ReturnType<typeof createApp> =>
    createApp({
      logger,
      services: {
        installations: {
          service: rig.service,
          customerOptional: optionalAuth('customer', SECRET),
          customerRequired: requireAuth('customer', SECRET),
          merchantRequired: requireAuth('merchant', SECRET),
        },
      },
    });
  const token = (subjectType: 'CUSTOMER' | 'MEMBER', subjectId: string): string =>
    signAccessToken({ secret: SECRET, subjectType, subjectId, ttlSec: 600 }).token;
  const body = { installationId: DEVICE.installationId, platform: 'IOS', appVersion: '2.0.0' };

  it('a guest registers without a token', async () => {
    const rig = setup();
    const res = await request(appFor(rig)).put('/customer/v1/installations').send(body);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({ installationId: DEVICE.installationId, linked: false });
    expect(rig.installations.docs[0]).toMatchObject({ language: 'ar', platform: 'IOS' });
  });

  it('the language comes from the body, else from Accept-Language', async () => {
    const rig = setup();
    await request(appFor(rig))
      .put('/customer/v1/installations')
      .set('Accept-Language', 'en')
      .send(body);
    expect(rig.installations.docs[0]?.['language']).toBe('en');
    await request(appFor(rig))
      .put('/customer/v1/installations')
      .set('Accept-Language', 'en')
      .send({ ...body, language: 'ar' });
    expect(rig.installations.docs[0]?.['language']).toBe('ar');
  });

  it('a signed-in customer is linked; a bad or foreign token is refused', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const app = appFor(rig);
    const ok = await request(app)
      .put('/customer/v1/installations')
      .set('Authorization', `Bearer ${token('CUSTOMER', id)}`)
      .send(body);
    expect(ok.status).toBe(200);
    expect(bodyOf(ok).data?.linked).toBe(true);
    const garbage = await request(app)
      .put('/customer/v1/installations')
      .set('Authorization', 'Bearer not.a.token')
      .send(body);
    expect(garbage.status).toBe(401);
    const merchant = await request(app)
      .put('/customer/v1/installations')
      .set('Authorization', `Bearer ${token('MEMBER', id)}`)
      .send(body);
    expect(merchant.status).toBe(403);
  });

  it('the merchant route needs a member token', async () => {
    const rig = setup();
    const member = addMember(rig);
    const app = appFor(rig);
    expect((await request(app).put('/merchant/v1/installations').send(body)).status).toBe(401);
    expect(
      (
        await request(app)
          .put('/merchant/v1/installations')
          .set('Authorization', `Bearer ${token('CUSTOMER', member)}`)
          .send(body)
      ).status,
    ).toBe(403);
    const ok = await request(app)
      .put('/merchant/v1/installations')
      .set('Authorization', `Bearer ${token('MEMBER', member)}`)
      .send(body);
    expect(ok.status).toBe(200);
    expect(rig.installations.docs[0]).toMatchObject({ app: 'MERCHANT' });
  });

  it('the push switch needs a customer token and a boolean', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const app = appFor(rig);
    expect(
      (
        await request(app)
          .patch('/customer/v1/installations/push-enabled')
          .send({ pushEnabled: false })
      ).status,
    ).toBe(401);
    const auth = { Authorization: `Bearer ${token('CUSTOMER', id)}` };
    const bad = await request(app)
      .patch('/customer/v1/installations/push-enabled')
      .set(auth)
      .send({ pushEnabled: 'no' });
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .patch('/customer/v1/installations/push-enabled')
      .set(auth)
      .send({ pushEnabled: false });
    expect(ok.status).toBe(200);
    expect(rig.customers.docs[0]?.['pushEnabled']).toBe(false);
    // the merchant app has no such route
    expect(
      (
        await request(app)
          .patch('/merchant/v1/installations/push-enabled')
          .set(auth)
          .send({ pushEnabled: false })
      ).status,
    ).toBe(404);
  });

  it.each([
    [{ ...body, installationId: 'short' }, 'body.installationId'],
    [{ ...body, platform: 'PALM' }, 'body.platform'],
    [{ ...body, appVersion: '' }, 'body.appVersion'],
    [{ ...body, language: 'fr' }, 'body.language'],
    [{ platform: 'IOS', appVersion: '1' }, 'body.installationId'],
  ])('validates %j', async (payload, field) => {
    const res = await request(appFor(setup())).put('/customer/v1/installations').send(payload);
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('answers 503, not 404, when the installations service is not configured', async () => {
    const res = await request(createApp({ logger })).put('/customer/v1/installations').send(body);
    expect(res.status).toBe(503);
  });
});
