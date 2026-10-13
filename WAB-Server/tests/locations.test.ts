import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createLocationsService } from '../src/domain/locations';
import { FakeStorageProvider } from '../src/providers/storage';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../src/repositories/locations.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const amman = new Types.ObjectId();
const irbid = new Types.ObjectId();

const countries = createFakeModel();
const cities = createFakeModel();
const areas = createFakeModel();
countries.docs.push(
  {
    _id: new Types.ObjectId(),
    code: 'JO',
    name: { ar: 'الأردن', en: 'Jordan' },
    dialCode: '+962',
    flagKey: 'flags/jo.svg',
    phoneRegex: '^7[789][0-9]{7}$',
    active: true,
    sortOrder: 2,
  },
  {
    _id: new Types.ObjectId(),
    code: 'XX',
    name: { ar: 'مخفية', en: 'Hidden' },
    dialCode: '+999',
    flagKey: 'flags/xx.svg',
    phoneRegex: '^1$',
    active: false,
    sortOrder: 1,
  },
  {
    _id: new Types.ObjectId(),
    code: 'SA',
    name: { ar: 'السعودية', en: 'Saudi Arabia' },
    dialCode: '+966',
    flagKey: 'flags/sa.svg',
    phoneRegex: '^5[0-9]{8}$',
    active: true,
    sortOrder: 1,
  },
);
cities.docs.push(
  { _id: irbid, name: { ar: 'إربد', en: 'Irbid' }, countryCode: 'JO', active: true, sortOrder: 2 },
  { _id: amman, name: { ar: 'عمّان', en: 'Amman' }, countryCode: 'JO', active: true, sortOrder: 1 },
  {
    _id: new Types.ObjectId(),
    name: { ar: 'م', en: 'Old' },
    countryCode: 'JO',
    active: false,
    sortOrder: 0,
  },
  {
    _id: new Types.ObjectId(),
    name: { ar: 'الرياض', en: 'Riyadh' },
    countryCode: 'SA',
    active: true,
    sortOrder: 1,
  },
);
areas.docs.push(
  {
    _id: new Types.ObjectId(),
    cityId: amman,
    name: { ar: 'عبدون', en: 'Abdoun' },
    active: true,
    sortOrder: 1,
  },
  {
    _id: new Types.ObjectId(),
    cityId: amman,
    name: { ar: 'مخفي', en: 'Off' },
    active: false,
    sortOrder: 0,
  },
  {
    _id: new Types.ObjectId(),
    cityId: irbid,
    name: { ar: 'الحي', en: 'Hay' },
    active: true,
    sortOrder: 1,
  },
);

interface Body {
  data: Record<string, string>[];
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const app = createApp({
  logger,
  services: {
    locations: createLocationsService({
      countries: new CountriesRepository(countries.model as never),
      cities: new CitiesRepository(cities.model as never),
      areas: new AreasRepository(areas.model as never),
      storage: new FakeStorageProvider(),
    }),
  },
});

describe.each(['customer', 'merchant'])('/%s/v1/locations', (ns) => {
  const base = `/${ns}/v1/locations`;

  it('lists active countries in admin order with a flag URL, localized', async () => {
    const ar = await request(app).get(`${base}/countries`);
    expect(ar.status).toBe(200);
    expect(bodyOf(ar).data.map((c) => c.code)).toEqual(['SA', 'JO']);
    expect(bodyOf(ar).data[1]).toMatchObject({ name: 'الأردن', dialCode: '+962' });
    expect(bodyOf(ar).data[1]?.flagUrl).toContain('flags/jo.svg');
    const en = await request(app).get(`${base}/countries`).set('Accept-Language', 'en');
    expect(bodyOf(en).data[1]?.name).toBe('Jordan');
  });

  it('lists active cities of one country only', async () => {
    const res = await request(app)
      .get(`${base}/cities?countryCode=JO`)
      .set('Accept-Language', 'en');
    expect(bodyOf(res).data.map((c) => c.name)).toEqual(['Amman', 'Irbid']);
    expect(bodyOf(res).data[0]?.id).toBe(amman.toHexString());
  });

  it('lists active areas of one city only', async () => {
    const res = await request(app)
      .get(`${base}/areas?cityId=${amman.toHexString()}`)
      .set('Accept-Language', 'en');
    expect(bodyOf(res).data.map((a) => a.name)).toEqual(['Abdoun']);
  });

  it('returns an empty list for an unknown country', async () => {
    const res = await request(app).get(`${base}/cities?countryCode=ZZ`);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual([]);
  });

  it.each([
    ['cities', 'countryCode=jo', 'query.countryCode'],
    ['cities', '', 'query.countryCode'],
    ['areas', 'cityId=nope', 'query.cityId'],
    ['areas', '', 'query.cityId'],
  ])('rejects /%s?%s', async (path, query, field) => {
    const res = await request(app).get(`${base}/${path}?${query}`);
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('answers 503 when the service is not configured', async () => {
    const res = await request(createApp({ logger })).get(`${base}/countries`);
    expect(res.status).toBe(503);
  });
});
