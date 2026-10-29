import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminCrud } from '../src/domain/adminCrud/adminCrud.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createCatalogService } from '../src/domain/catalog';
import { requireAuth } from '../src/middlewares/auth';
import type { CatalogServiceRaw } from '../src/models/catalogService.model';
import { FakeStorageProvider } from '../src/providers/storage';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const fake = createFakeModel();
const repo = new CatalogServicesRepository(fake.model as never);
const audits: Record<string, unknown>[] = [];
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    catalog: createCatalogService({ catalog: repo, storage: new FakeStorageProvider() }),
    adminCatalog: createAdminCrud<CatalogServiceRaw>({
      name: 'CATALOG_SERVICE',
      entityType: 'catalogService',
      store: repo,
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
  data: Record<string, unknown> & Record<string, string>[];
  meta?: { total: number; page: number; pageSize: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const auth = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`,
});
const svc = (en: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  name: { ar: `${en}-ar`, en },
  description: { ar: 'وصف', en: 'desc' },
  imageKey: `catalog/${en}.jpg`,
  businessType: 'SALON',
  audience: 'FEMALE',
  active: true,
  sortOrder: 0,
  ...over,
});
const NEW = {
  name: { ar: 'قص', en: 'Cut' },
  description: { ar: 'قص الشعر', en: 'Haircut' },
  imageKey: 'catalog/cut.jpg',
  businessType: 'SALON',
  audience: 'MALE',
  reason: 'new service',
};

beforeEach(() => {
  fake.docs.length = 0;
  audits.length = 0;
});

describe.each(['customer', 'merchant'])('GET /%s/v1/catalog/services', (ns) => {
  it('lists active services of the gender in admin order, localized, paginated', async () => {
    fake.docs.push(
      svc('C', { sortOrder: 3 }),
      svc('A', { sortOrder: 1 }),
      svc('B', { sortOrder: 2 }),
      svc('Hidden', { active: false }),
      svc('Men', { audience: 'MALE' }),
      svc('Botox', { businessType: 'CLINIC', audience: 'BOTH', sortOrder: 9 }),
    );
    const res = await request(app)
      .get(`/${ns}/v1/catalog/services?gender=FEMALE&pageSize=2`)
      .set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    const items = bodyOf(res).data as unknown as Record<string, string>[];
    expect(items.map((s) => s['name'])).toEqual(['A', 'B']);
    expect(items[0]?.['imageUrl']).toContain('catalog/A.jpg');
    expect(bodyOf(res).meta).toMatchObject({ total: 4, page: 1, pageSize: 2 });
    expect(items[0]).toMatchObject({ businessType: 'SALON', audience: 'FEMALE' });
    const ar = await request(app).get(
      `/${ns}/v1/catalog/services?gender=FEMALE&businessType=SALON&page=2&pageSize=2`,
    );
    expect((bodyOf(ar).data as unknown as Record<string, string>[]).map((s) => s['name'])).toEqual([
      'C-ar',
    ]);
  });

  it('filters by business type; without a gender every audience is listed (§5.19)', async () => {
    fake.docs.push(
      svc('Cut'),
      svc('Beard', { audience: 'MALE' }),
      svc('Botox', { businessType: 'CLINIC', audience: 'BOTH' }),
    );
    const names = async (query: string): Promise<string[]> =>
      (
        bodyOf(
          await request(app)
            .get(`/${ns}/v1/catalog/services?${query}`)
            .set('Accept-Language', 'en'),
        ).data as unknown as Record<string, string>[]
      ).map((s) => s['name'] ?? '');
    expect(await names('businessType=CLINIC')).toEqual(['Botox']);
    expect((await names('businessType=SALON')).sort()).toEqual(['Beard', 'Cut']);
    expect((await names('gender=MALE')).sort()).toEqual(['Beard', 'Botox']);
    expect(await names('')).toHaveLength(3);
  });

  it.each([
    '?gender=OTHER',
    '?businessType=SPA',
    '?gender=FEMALE&page=0',
    '?gender=FEMALE&pageSize=101',
  ])('rejects %j', async (query) => {
    expect((await request(app).get(`/${ns}/v1/catalog/services${query}`)).status).toBe(400);
  });

  it('answers 503 when unconfigured', async () => {
    const res = await request(createApp({ logger })).get(`/${ns}/v1/catalog/services?gender=MALE`);
    expect(res.status).toBe(503);
  });
});

describe('/admin/v1/catalog/services', () => {
  it('needs an admin token, creates with a reason and audits it', async () => {
    expect((await request(app).post('/admin/v1/catalog/services').send(NEW)).status).toBe(401);
    const res = await request(app).post('/admin/v1/catalog/services').set(auth()).send(NEW);
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      active: true,
      sortOrder: 0,
      businessType: 'SALON',
      audience: 'MALE',
    });
    expect(audits[0]).toMatchObject({ action: 'CATALOG_SERVICE_CREATE', reason: 'new service' });
  });

  it('rejects missing reason, bad type/audience, a non-BOTH clinic service and empty text', async () => {
    for (const bad of [
      { ...NEW, reason: '' },
      { ...NEW, audience: 'KIDS' },
      { ...NEW, businessType: 'SPA' },
      { ...NEW, businessType: 'CLINIC', audience: 'FEMALE' },
      { ...NEW, name: { ar: '', en: 'x' } },
    ]) {
      expect(
        (await request(app).post('/admin/v1/catalog/services').set(auth()).send(bad)).status,
      ).toBe(400);
    }
    expect(fake.docs).toHaveLength(0);
  });

  it('updates fields, switches off with active=false, and keeps business type and audience fixed', async () => {
    const created = bodyOf(
      await request(app).post('/admin/v1/catalog/services').set(auth()).send(NEW),
    );
    const id = String(created.data['id']);
    const res = await request(app)
      .patch(`/admin/v1/catalog/services/${id}`)
      .set(auth())
      .send({ active: false, audience: 'FEMALE', businessType: 'CLINIC', reason: 'retired' });
    expect(res.status).toBe(200);
    expect(fake.docs[0]).toMatchObject({ active: false, businessType: 'SALON', audience: 'MALE' });
    const list = await request(app).get('/customer/v1/catalog/services?gender=MALE');
    expect(bodyOf(list).data).toHaveLength(0);
    expect(
      (
        await request(app)
          .patch(`/admin/v1/catalog/services/${id}`)
          .set(auth())
          .send({ reason: 'x' })
      ).status,
    ).toBe(400);
  });

  it('lists all (inactive too) filtered by business type and audience with both languages', async () => {
    fake.docs.push(
      svc('A'),
      svc('B', { active: false }),
      svc('M', { audience: 'MALE' }),
      svc('Botox', { businessType: 'CLINIC', audience: 'BOTH' }),
    );
    const res = await request(app).get('/admin/v1/catalog/services?audience=FEMALE').set(auth());
    expect(bodyOf(res).data).toHaveLength(2);
    const clinic = await request(app)
      .get('/admin/v1/catalog/services?businessType=CLINIC')
      .set(auth());
    expect(bodyOf(clinic).data).toHaveLength(1);
    expect(bodyOf(res).data[0]?.['name']).toEqual({ ar: 'A-ar', en: 'A' });
  });
});
