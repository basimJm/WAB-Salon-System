import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { assertBannerRules, createAdminBannerService } from '../src/domain/adminCrud/banners';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createBannersService } from '../src/domain/banners';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { BannersRepository } from '../src/repositories/banners.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-06-15T12:00:00Z');
const fake = createFakeModel();
const repo = new BannersRepository(fake.model as never);
const audits: Record<string, unknown>[] = [];
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    banners: createBannersService({
      banners: repo,
      storage: new FakeStorageProvider(),
      now: () => NOW,
    }),
    adminBanners: createAdminBannerService(
      repo,
      createAuditWriter({
        append: (data) => {
          audits.push(data);
          return Promise.resolve({ id: 'a', ...data } as never);
        },
      }),
    ),
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const auth = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`,
});
const row = (over: Record<string, unknown>): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  imageKey: { ar: 'banners/ar.jpg', en: 'banners/en.jpg' },
  action: 'NONE',
  gender: 'BOTH',
  startAt: new Date('2026-06-01T00:00:00Z'),
  endAt: new Date('2026-07-01T00:00:00Z'),
  order: 0,
  active: true,
  ...over,
});
const NEW = {
  imageKey: { ar: 'a.jpg', en: 'e.jpg' },
  gender: 'FEMALE',
  startAt: '2026-06-01T00:00:00Z',
  endAt: '2026-07-01T00:00:00Z',
  reason: 'summer campaign',
};

beforeEach(() => {
  fake.docs.length = 0;
  audits.length = 0;
});

describe('GET /customer/v1/banners', () => {
  it('returns live banners of the audience and BOTH, in order, with the language image', async () => {
    const salon = new Types.ObjectId().toHexString();
    fake.docs.push(
      row({ order: 2, gender: 'FEMALE', action: 'SALON', actionValue: salon }),
      row({ order: 1, gender: 'BOTH' }),
      row({ gender: 'MALE' }),
      row({ active: false }),
      row({ endAt: NOW }),
      row({ startAt: new Date('2026-06-16T00:00:00Z') }),
    );
    const res = await request(app)
      .get('/customer/v1/banners?gender=FEMALE')
      .set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    const items = bodyOf(res).data as unknown as Record<string, string>[];
    expect(items.map((b) => b['actionType'])).toEqual(['NONE', 'SALON']);
    expect(items[0]?.['imageUrl']).toContain('banners/en.jpg');
    expect(items[1]?.['actionValue']).toBe(salon);
    expect(items[0]?.['actionValue']).toBeNull();
    const ar = await request(app).get('/customer/v1/banners?gender=FEMALE');
    expect((bodyOf(ar).data as unknown as Record<string, string>[])[0]?.['imageUrl']).toContain(
      'banners/ar.jpg',
    );
  });

  it('includes a banner exactly at its start and rejects a missing or unknown gender', async () => {
    fake.docs.push(row({ startAt: NOW }));
    const ok = await request(app).get('/customer/v1/banners?gender=MALE');
    expect(bodyOf(ok).data).toHaveLength(1);
    expect((await request(app).get('/customer/v1/banners')).status).toBe(400);
    expect((await request(app).get('/customer/v1/banners?gender=BOTH')).status).toBe(400);
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (await request(createApp({ logger })).get('/customer/v1/banners?gender=MALE')).status,
    ).toBe(503);
  });
});

describe('/admin/v1/banners', () => {
  it('creates with defaults and audits with the reason; needs an admin token', async () => {
    expect((await request(app).post('/admin/v1/banners').send(NEW)).status).toBe(401);
    const res = await request(app).post('/admin/v1/banners').set(auth()).send(NEW);
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({ action: 'NONE', active: true, order: 0 });
    expect(audits[0]).toMatchObject({ action: 'BANNER_CREATE', reason: 'summer campaign' });
  });

  it.each([
    ['SALON without a value', { action: 'SALON' }],
    ['NONE with a value', { actionValue: 'https://example.com/x' }],
    ['end before start', { endAt: '2026-05-01T00:00:00Z' }],
    ['bad value', { action: 'EXTERNAL_URL', actionValue: 'javascript:alert(1)' }],
    ['no reason', { reason: ' ' }],
  ])('rejects %s and stores nothing', async (_name, over) => {
    const res = await request(app)
      .post('/admin/v1/banners')
      .set(auth())
      .send({ ...NEW, ...over });
    expect(res.status).toBe(400);
    expect(fake.docs).toHaveLength(0);
  });

  it('accepts a salon id or an https link and switches a banner off by patch', async () => {
    const link = await request(app)
      .post('/admin/v1/banners')
      .set(auth())
      .send({ ...NEW, action: 'EXTERNAL_URL', actionValue: 'https://example.com/promo' });
    expect(link.status).toBe(201);
    const id = String(bodyOf(link).data['id']);
    const off = await request(app)
      .patch(`/admin/v1/banners/${id}`)
      .set(auth())
      .send({ active: false, reason: 'ended early' });
    expect(off.status).toBe(200);
    expect(fake.docs[0]?.['active']).toBe(false);
    const live = await request(app).get('/customer/v1/banners?gender=FEMALE');
    expect(bodyOf(live).data).toHaveLength(0);
  });

  it('validates a patch against the stored banner (clear the value when switching to NONE)', async () => {
    const created = await request(app)
      .post('/admin/v1/banners')
      .set(auth())
      .send({ ...NEW, action: 'EXTERNAL_URL', actionValue: 'https://example.com/promo' });
    const id = String(bodyOf(created).data['id']);
    expect(
      (
        await request(app)
          .patch(`/admin/v1/banners/${id}`)
          .set(auth())
          .send({ action: 'NONE', reason: 'x' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/admin/v1/banners/${id}`)
          .set(auth())
          .send({ action: 'NONE', actionValue: null, reason: 'x' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/admin/v1/banners/${id}`)
          .set(auth())
          .send({ endAt: '2026-01-01T00:00:00Z', reason: 'x' })
      ).status,
    ).toBe(400);
  });
});

describe('assertBannerRules', () => {
  it('treats null and absent action values alike', () => {
    expect(() => {
      assertBannerRules({ action: 'NONE', actionValue: null });
    }).not.toThrow();
    expect(() => {
      assertBannerRules({ action: 'SALON', actionValue: null });
    }).toThrow();
  });
});
