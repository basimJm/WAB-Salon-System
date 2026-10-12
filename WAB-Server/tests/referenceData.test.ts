import type { Model } from 'mongoose';
import {
  COUNTRY_CODE_PATTERN,
  DIAL_CODE_PATTERN,
  JORDAN_CODE,
  SEED_AREAS,
  SEED_CITIES,
  SEED_COUNTRIES,
} from '../src/constants/referenceData';
import { AreaModel, type AreaRaw } from '../src/models/area.model';
import { CityModel, type CityRaw } from '../src/models/city.model';
import { CountryModel, type CountryRaw } from '../src/models/country.model';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../src/repositories/locations.repository';
import { seedReferenceData } from '../src/seeds/referenceData';
import { createFakeModel } from './helpers/fakeModel';

const ARABIC = /[؀-ۿ]/;

describe('seed data', () => {
  it('covers Jordan, its 12 governorate cities and the Amman starter areas', () => {
    expect(SEED_COUNTRIES.map((c) => c.code)).toEqual([JORDAN_CODE]);
    expect(SEED_CITIES).toHaveLength(12);
    expect(SEED_AREAS.length).toBeGreaterThanOrEqual(5);
  });

  it('names everything in both languages, Arabic in Arabic script', () => {
    const names = [...SEED_COUNTRIES, ...SEED_CITIES, ...SEED_AREAS].map((r) => r.name);
    for (const { ar, en } of names) {
      expect(ar).toMatch(ARABIC);
      expect(en.length).toBeGreaterThan(0);
      expect(en).not.toMatch(ARABIC);
    }
  });

  it('has well-formed country codes and dial codes', () => {
    for (const country of SEED_COUNTRIES) {
      expect(country.code).toMatch(COUNTRY_CODE_PATTERN);
      expect(country.dialCode).toMatch(DIAL_CODE_PATTERN);
    }
    expect(SEED_CITIES.every((c) => COUNTRY_CODE_PATTERN.test(c.countryCode))).toBe(true);
    const codes = new Set(SEED_COUNTRIES.map((c) => c.code));
    expect(SEED_CITIES.every((c) => codes.has(c.countryCode))).toBe(true);
  });

  it('has no duplicate names and unique sort orders within each list', () => {
    const cityNames = SEED_CITIES.map((c) => c.name.en);
    expect(new Set(cityNames).size).toBe(cityNames.length);
    expect(new Set(SEED_CITIES.map((c) => c.sortOrder)).size).toBe(SEED_CITIES.length);
    const areaKeys = SEED_AREAS.map((a) => `${a.city}/${a.name.en}`);
    expect(new Set(areaKeys).size).toBe(areaKeys.length);
    expect(new Set(SEED_AREAS.map((a) => a.sortOrder)).size).toBe(SEED_AREAS.length);
  });

  it('puts every area in a city that is seeded', () => {
    const cities = new Set(SEED_CITIES.map((c) => c.name.en));
    expect(SEED_AREAS.every((a) => cities.has(a.city))).toBe(true);
  });

  it('accepts Jordanian mobile national numbers and nothing else', () => {
    const regex = new RegExp(SEED_COUNTRIES[0]?.phoneRegex ?? '');
    for (const ok of ['771234567', '781234567', '791234567']) expect(regex.test(ok)).toBe(true);
    for (const bad of [
      '0791234567',
      '761234567',
      '79123456',
      '7912345678',
      '+962791234567',
      'abc',
      '',
    ]) {
      expect(regex.test(bad)).toBe(false);
    }
  });
});

type Validatable = new (data: object) => { validate(): Promise<unknown> };

const failingFields = async (model: Validatable, data: object): Promise<string[]> => {
  try {
    await new model(data).validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).sort();
  }
};
const countryData = (): Record<string, unknown> => ({ ...SEED_COUNTRIES[0], active: true });

describe('location models', () => {
  it('declare the indexes of BUSINESS_DOMAIN.md §3.2', () => {
    expect(CountryModel.schema.indexes()).toEqual([
      [{ code: 1 }, expect.objectContaining({ unique: true })],
    ]);
    expect(CityModel.schema.indexes()).toEqual([
      [{ countryCode: 1, active: 1, sortOrder: 1 }, expect.anything()],
    ]);
    expect(AreaModel.schema.indexes()).toEqual([
      [{ cityId: 1, active: 1, sortOrder: 1 }, expect.anything()],
    ]);
  });

  it('accept the seed data', async () => {
    const country = CountryModel;
    expect(await failingFields(country, countryData())).toEqual([]);
    expect(await failingFields(CityModel, { ...SEED_CITIES[0] })).toEqual([]);
  });

  it('reject a bad country code, dial code, regex, or missing name', async () => {
    const country = CountryModel;
    expect(await failingFields(country, { ...countryData(), code: 'jo' })).toEqual(['code']);
    expect(await failingFields(country, { ...countryData(), code: 'JOR' })).toEqual(['code']);
    expect(await failingFields(country, { ...countryData(), dialCode: '962' })).toEqual([
      'dialCode',
    ]);
    expect(await failingFields(country, { ...countryData(), phoneRegex: '([' })).toEqual([
      'phoneRegex',
    ]);
    expect(await failingFields(country, { ...countryData(), name: { ar: 'الأردن' } })).toEqual([
      'name.en',
    ]);
    expect(await failingFields(country, {})).toEqual([
      'code',
      'dialCode',
      'flagKey',
      'name',
      'phoneRegex',
    ]);
  });

  it('require a name and country for a city, and a city and name for an area', async () => {
    expect(await failingFields(CityModel, {})).toEqual(['countryCode', 'name']);
    expect(await failingFields(AreaModel, {})).toEqual(['cityId', 'name']);
  });

  it('default to active with sort order 0', () => {
    const city = new CityModel({ name: { ar: 'س', en: 's' }, countryCode: 'JO' });
    expect([city.active, city.sortOrder]).toEqual([true, 0]);
  });
});

const makeRepos = (): {
  repos: { countries: CountriesRepository; cities: CitiesRepository; areas: AreasRepository };
  fakes: {
    countries: ReturnType<typeof createFakeModel>;
    cities: ReturnType<typeof createFakeModel>;
    areas: ReturnType<typeof createFakeModel>;
  };
} => {
  const fakes = {
    countries: createFakeModel(),
    cities: createFakeModel(),
    areas: createFakeModel(),
  };
  return {
    fakes,
    repos: {
      countries: new CountriesRepository(fakes.countries.model as unknown as Model<CountryRaw>),
      cities: new CitiesRepository(fakes.cities.model as unknown as Model<CityRaw>),
      areas: new AreasRepository(fakes.areas.model as unknown as Model<AreaRaw>),
    },
  };
};

describe('insertIfMissing', () => {
  it('creates once and returns the existing record afterwards, untouched', async () => {
    const { repos, fakes } = makeRepos();
    const first = await repos.cities.insertIfMissing(
      { countryCode: 'JO', 'name.en': 'Amman' },
      { countryCode: 'JO', name: { ar: 'عمّان', en: 'Amman' }, sortOrder: 1, active: true },
    );
    expect(first.created).toBe(true);
    const second = await repos.cities.insertIfMissing(
      { countryCode: 'JO', 'name.en': 'Amman' },
      { countryCode: 'JO', name: { ar: 'غير', en: 'Amman' }, sortOrder: 99, active: false },
    );
    expect(second).toMatchObject({
      created: false,
      entity: { id: first.entity.id, sortOrder: 1, active: true },
    });
    expect(fakes.cities.docs).toHaveLength(1);
  });

  it('tells records apart by the natural key, including dotted paths', async () => {
    const { repos, fakes } = makeRepos();
    const make = (en: string): ReturnType<typeof repos.cities.insertIfMissing> =>
      repos.cities.insertIfMissing({ 'name.en': en }, { name: { ar: 'س', en }, countryCode: 'JO' });
    await make('A');
    await make('B');
    expect((await make('A')).created).toBe(false);
    expect(fakes.cities.docs).toHaveLength(2);
  });
});

describe('seedReferenceData with custom data', () => {
  it('keeps areas with the same name in different cities apart, and rejects an unknown city', async () => {
    const { repos, fakes } = makeRepos();
    const data = {
      countries: [],
      cities: [
        { countryCode: 'JO', name: { ar: 'أ', en: 'A' }, sortOrder: 1 },
        { countryCode: 'JO', name: { ar: 'ب', en: 'B' }, sortOrder: 2 },
      ],
      areas: [
        { city: 'A', name: { ar: 'وسط', en: 'Center' }, sortOrder: 1 },
        { city: 'B', name: { ar: 'وسط', en: 'Center' }, sortOrder: 1 },
      ],
    };
    const result = await seedReferenceData(repos, data);
    expect(result.areas).toEqual({ created: 2, existing: 0 });
    expect(new Set(fakes.areas.docs.map((d) => String(d['cityId']))).size).toBe(2);
    await expect(
      seedReferenceData(repos, {
        ...data,
        areas: [{ city: 'Nowhere', name: { ar: 'س', en: 'X' }, sortOrder: 1 }],
      }),
    ).rejects.toThrow('unknown city');
  });
});

describe('seedReferenceData', () => {
  it('creates everything on an empty database and links areas to their city', async () => {
    const { repos, fakes } = makeRepos();
    const result = await seedReferenceData(repos);
    expect(result).toEqual({
      countries: { created: 1, existing: 0 },
      cities: { created: SEED_CITIES.length, existing: 0 },
      areas: { created: SEED_AREAS.length, existing: 0 },
    });
    const amman = fakes.cities.docs.find((d) => (d['name'] as { en: string }).en === 'Amman');
    expect(fakes.areas.docs.every((d) => String(d['cityId']) === String(amman?.['_id']))).toBe(
      true,
    );
  });

  it('is idempotent: a second run creates nothing', async () => {
    const { repos, fakes } = makeRepos();
    await seedReferenceData(repos);
    const before = [fakes.countries.docs.length, fakes.cities.docs.length, fakes.areas.docs.length];
    const again = await seedReferenceData(repos);
    expect(again).toEqual({
      countries: { created: 0, existing: 1 },
      cities: { created: 0, existing: SEED_CITIES.length },
      areas: { created: 0, existing: SEED_AREAS.length },
    });
    expect([
      fakes.countries.docs.length,
      fakes.cities.docs.length,
      fakes.areas.docs.length,
    ]).toEqual(before);
  });

  it('keeps what an admin changed, and fills in only what is missing', async () => {
    const { repos, fakes } = makeRepos();
    await seedReferenceData(repos);
    const irbid = fakes.cities.docs.find((d) => (d['name'] as { en: string }).en === 'Irbid');
    if (irbid) Object.assign(irbid, { active: false, sortOrder: 50 });
    const khalda = fakes.areas.docs.findIndex((d) => (d['name'] as { en: string }).en === 'Khalda');
    fakes.areas.docs.splice(khalda, 1); // deleted by hand

    const again = await seedReferenceData(repos);

    expect(again.areas).toEqual({ created: 1, existing: SEED_AREAS.length - 1 });
    expect(irbid).toMatchObject({ active: false, sortOrder: 50 });
    expect(fakes.areas.docs).toHaveLength(SEED_AREAS.length);
  });
});
