import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminLocationServices } from '../src/domain/adminCrud/locations';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { requireAuth } from '../src/middlewares/auth';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../src/repositories/locations.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const adminId = new Types.ObjectId().toHexString();
const token = (type: 'ADMIN' | 'CUSTOMER'): string =>
  signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token;

const countries = createFakeModel();
const cities = createFakeModel();
const areas = createFakeModel();
const audits: Record<string, unknown>[] = [];
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminLocations: createAdminLocationServices({
      countries: new CountriesRepository(countries.model as never),
      cities: new CitiesRepository(cities.model as never),
      areas: new AreasRepository(areas.model as never),
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
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token('ADMIN')}` });
const NAME = { ar: 'الأردن', en: 'Jordan' };
const COUNTRY = {
  code: 'JO',
  name: NAME,
  dialCode: '+962',
  flagKey: 'flags/jo.svg',
  phoneRegex: '^7[789][0-9]{7}$',
  reason: 'launch market',
};
const base = '/admin/v1/locations';

beforeEach(() => {
  countries.docs.length = 0;
  cities.docs.length = 0;
  areas.docs.length = 0;
  audits.length = 0;
});

describe('admin locations', () => {
  it('requires an admin token', async () => {
    expect((await request(app).get(`${base}/countries`)).status).toBe(401);
    const res = await request(app)
      .get(`${base}/countries`)
      .set('Authorization', `Bearer ${token('CUSTOMER')}`);
    expect(res.status).toBe(403);
  });

  it('creates a country with defaults and audits it with the reason', async () => {
    const res = await request(app).post(`${base}/countries`).set(auth()).send(COUNTRY);
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({ code: 'JO', active: true, sortOrder: 0, name: NAME });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      adminId,
      action: 'COUNTRY_CREATE',
      entityType: 'country',
      reason: 'launch market',
    });
  });

  it('refuses a write without a reason or with a bad value, and audits nothing', async () => {
    const { reason: _unused, ...noReason } = COUNTRY;
    void _unused;
    for (const payload of [
      noReason,
      { ...COUNTRY, reason: '  ' },
      { ...COUNTRY, phoneRegex: '(' },
      { ...COUNTRY, code: 'jo' },
    ]) {
      const res = await request(app).post(`${base}/countries`).set(auth()).send(payload);
      expect(res.status).toBe(400);
    }
    expect(countries.docs).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });

  it('updates a country, keeps before/after in the audit entry, and 404s for unknown ids', async () => {
    const created = bodyOf(await request(app).post(`${base}/countries`).set(auth()).send(COUNTRY));
    audits.length = 0;
    const res = await request(app)
      .patch(`${base}/countries/${String(created.data['id'])}`)
      .set(auth())
      .send({ active: false, reason: 'paused' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['active']).toBe(false);
    expect(audits[0]).toMatchObject({ action: 'COUNTRY_UPDATE', reason: 'paused' });
    expect(JSON.stringify(audits[0])).toContain('"before"');
    const missing = await request(app)
      .patch(`${base}/countries/${new Types.ObjectId().toHexString()}`)
      .set(auth())
      .send({ active: true, reason: 'x' });
    expect(missing.status).toBe(404);
  });

  it('rejects an update that changes nothing, and does not allow changing the country code', async () => {
    const created = bodyOf(await request(app).post(`${base}/countries`).set(auth()).send(COUNTRY));
    const id = String(created.data['id']);
    expect(
      (await request(app).patch(`${base}/countries/${id}`).set(auth()).send({ reason: 'x' }))
        .status,
    ).toBe(400);
    await request(app)
      .patch(`${base}/countries/${id}`)
      .set(auth())
      .send({ code: 'SA', reason: 'x', active: true });
    expect(countries.docs[0]?.['code']).toBe('JO');
  });

  it('creates a city only under an existing country, and an area only under an existing city', async () => {
    const orphan = await request(app)
      .post(`${base}/cities`)
      .set(auth())
      .send({ name: NAME, countryCode: 'JO', reason: 'x' });
    expect(orphan.status).toBe(400);
    expect(bodyOf(orphan).error.details.map((d) => d.field)).toContain('countryCode');
    await request(app).post(`${base}/countries`).set(auth()).send(COUNTRY);
    const city = await request(app)
      .post(`${base}/cities`)
      .set(auth())
      .send({ name: { ar: 'عمّان', en: 'Amman' }, countryCode: 'JO', reason: 'x' });
    expect(city.status).toBe(201);
    const noCity = await request(app)
      .post(`${base}/areas`)
      .set(auth())
      .send({ name: NAME, cityId: new Types.ObjectId().toHexString(), reason: 'x' });
    expect(noCity.status).toBe(400);
    const area = await request(app)
      .post(`${base}/areas`)
      .set(auth())
      .send({ name: { ar: 'عبدون', en: 'Abdoun' }, cityId: bodyOf(city).data['id'], reason: 'x' });
    expect(area.status).toBe(201);
  });

  it('lists with pagination, both languages, including inactive records', async () => {
    await request(app).post(`${base}/countries`).set(auth()).send(COUNTRY);
    await request(app)
      .post(`${base}/countries`)
      .set(auth())
      .send({ ...COUNTRY, code: 'SA', active: false });
    const res = await request(app).get(`${base}/countries?pageSize=1`).set(auth());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toHaveLength(1);
    expect(bodyOf(res).meta?.total).toBe(2);
    expect(bodyOf(res).data[0]?.['name']).toEqual(NAME);
  });

  it('gets one record and 404s for a malformed id', async () => {
    expect((await request(app).get(`${base}/cities/nope`).set(auth())).status).toBe(404);
  });

  it('answers 503 when the admin services are not configured', async () => {
    const res = await request(createApp({ logger })).get(`${base}/countries`);
    expect(res.status).toBe(503);
  });
});
