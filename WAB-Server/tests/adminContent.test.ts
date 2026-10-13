import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { assertVersionOrder, createAdminContentServices } from '../src/domain/adminCrud/content';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { requireAuth } from '../src/middlewares/auth';
import {
  AppVersionsRepository,
  ContactInfoRepository,
  MaintenanceRepository,
} from '../src/repositories/appConfig.repository';
import { ContentPagesRepository, FaqsRepository } from '../src/repositories/content.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const adminId = new Types.ObjectId().toHexString();
const fakes = {
  pages: createFakeModel(),
  faqs: createFakeModel(),
  contact: createFakeModel(),
  versions: createFakeModel(),
  maintenance: createFakeModel(),
};
const audits: Record<string, unknown>[] = [];
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminContent: createAdminContentServices({
      pages: new ContentPagesRepository(fakes.pages.model as never),
      faqs: new FaqsRepository(fakes.faqs.model as never),
      contactInfo: new ContactInfoRepository(fakes.contact.model as never),
      appVersions: new AppVersionsRepository(fakes.versions.model as never),
      maintenance: new MaintenanceRepository(fakes.maintenance.model as never),
      audit: createAuditWriter({
        append: (data) => {
          audits.push(data);
          return Promise.resolve({ id: 'a', ...data } as never);
        },
      }),
    }),
  },
});

interface Body {
  data: Record<string, unknown>;
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const auth = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId, ttlSec: 600 }).token}`,
});
const text = { ar: 'نص', en: 'Text' };
const VERSION = {
  app: 'CUSTOMER',
  platform: 'ANDROID',
  latest: '2.0.0',
  minSupported: '1.5',
  storeUrl: 'https://store.example/app',
  reason: 'release',
};

beforeEach(() => {
  for (const f of Object.values(fakes)) f.docs.length = 0;
  audits.length = 0;
});

describe('admin content and app config', () => {
  it.each([
    [
      '/admin/v1/content/pages',
      { app: 'CUSTOMER', kind: 'PRIVACY', body: text },
      'CONTENT_PAGE_CREATE',
    ],
    ['/admin/v1/content/faqs', { app: 'MERCHANT', question: text, answer: text }, 'FAQ_CREATE'],
    [
      '/admin/v1/content/contact-info',
      { app: 'CUSTOMER', phone: '+962791234567', whatsapp: '+962791234567', email: 'Help@Wab.JO' },
      'CONTACT_INFO_CREATE',
    ],
    ['/admin/v1/app-config/versions', VERSION, 'APP_VERSION_CREATE'],
    ['/admin/v1/app-config/maintenance', { app: 'CUSTOMER', message: text }, 'MAINTENANCE_CREATE'],
  ])('creates through %s with a reason and an audit entry', async (path, payload, action) => {
    const res = await request(app)
      .post(path)
      .set(auth())
      .send({ reason: 'initial setup', ...payload });
    expect(res.status).toBe(201);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action, reason: expect.any(String) as string, adminId });
    const rest: Record<string, unknown> = { ...payload };
    Reflect.deleteProperty(rest, 'reason');
    const noReason = await request(app).post(path).set(auth()).send(rest);
    expect(noReason.status).toBe(400);
    expect(audits).toHaveLength(1);
  });

  it('lower-cases the contact email and applies defaults', async () => {
    const res = await request(app).post('/admin/v1/content/contact-info').set(auth()).send({
      app: 'CUSTOMER',
      phone: '+962791234567',
      whatsapp: '+962791234567',
      email: 'Help@Wab.JO',
      reason: 'x',
    });
    expect(bodyOf(res).data['email']).toBe('help@wab.jo');
    const m = await request(app)
      .post('/admin/v1/app-config/maintenance')
      .set(auth())
      .send({ app: 'CUSTOMER', message: text, reason: 'x' });
    expect(bodyOf(m).data['enabled']).toBe(false);
  });

  it('turns maintenance on by patch, audited with before and after', async () => {
    const created = bodyOf(
      await request(app)
        .post('/admin/v1/app-config/maintenance')
        .set(auth())
        .send({ app: 'MERCHANT', message: text, reason: 'x' }),
    );
    audits.length = 0;
    const res = await request(app)
      .patch(`/admin/v1/app-config/maintenance/${String(created.data['id'])}`)
      .set(auth())
      .send({ enabled: true, reason: 'planned upgrade' });
    expect(bodyOf(res).data['enabled']).toBe(true);
    expect(audits[0]).toMatchObject({ action: 'MAINTENANCE_UPDATE', reason: 'planned upgrade' });
  });

  it('rejects a version policy whose minimum is newer than the latest build', async () => {
    const res = await request(app)
      .post('/admin/v1/app-config/versions')
      .set(auth())
      .send({ ...VERSION, minSupported: '3.0' });
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain('minSupported');
    const created = bodyOf(
      await request(app).post('/admin/v1/app-config/versions').set(auth()).send(VERSION),
    );
    const patch = await request(app)
      .patch(`/admin/v1/app-config/versions/${String(created.data['id'])}`)
      .set(auth())
      .send({ latest: '1.0', reason: 'x' });
    expect(patch.status).toBe(400);
    expect(fakes.versions.docs[0]?.['latest']).toBe('2.0.0');
  });

  it.each([
    ['/admin/v1/app-config/versions', { ...VERSION, latest: 'abc' }],
    ['/admin/v1/app-config/versions', { ...VERSION, storeUrl: 'http://insecure.example' }],
    ['/admin/v1/content/pages', { app: 'OTHER', kind: 'PRIVACY', body: text, reason: 'x' }],
    [
      '/admin/v1/content/contact-info',
      {
        app: 'CUSTOMER',
        phone: '0791234567',
        whatsapp: '+962791234567',
        email: 'a@b.co',
        reason: 'x',
      },
    ],
  ])('rejects invalid input on %s', async (path, payload) => {
    expect((await request(app).post(path).set(auth()).send(payload)).status).toBe(400);
  });

  it('keeps app, kind and platform immutable on update', async () => {
    const created = bodyOf(
      await request(app)
        .post('/admin/v1/content/pages')
        .set(auth())
        .send({ app: 'CUSTOMER', kind: 'TERMS', body: text, reason: 'x' }),
    );
    await request(app)
      .patch(`/admin/v1/content/pages/${String(created.data['id'])}`)
      .set(auth())
      .send({ app: 'MERCHANT', kind: 'ABOUT', body: { ar: 'جديد', en: 'New' }, reason: 'x' });
    expect(fakes.pages.docs[0]).toMatchObject({
      app: 'CUSTOMER',
      kind: 'TERMS',
      body: { en: 'New' },
    });
  });

  it('requires an admin token and answers 503 when unconfigured', async () => {
    expect((await request(app).get('/admin/v1/content/faqs')).status).toBe(401);
    expect((await request(createApp({ logger })).get('/admin/v1/content/faqs')).status).toBe(503);
  });
});

describe('assertVersionOrder', () => {
  it('uses the merged values and allows equal versions', () => {
    expect(() => {
      assertVersionOrder({ minSupported: '2.0' }, { latest: '2.0.0' });
    }).not.toThrow();
    expect(() => {
      assertVersionOrder({ minSupported: '2.1' }, { latest: '2.0.0' });
    }).toThrow();
    expect(() => {
      assertVersionOrder({ latest: '1.0' }, { minSupported: '1.5' });
    }).toThrow();
    expect(() => {
      assertVersionOrder({ latest: '1.0' });
    }).not.toThrow();
  });
});
