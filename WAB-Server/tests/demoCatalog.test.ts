import type { Model } from 'mongoose';
import { DEMO_IMAGE_PREFIX, DEMO_SERVICES } from '../src/constants/demoCatalog';
import { GENDERS } from '../src/constants/enums';
import { CatalogServiceModel, type CatalogServiceRaw } from '../src/models/catalogService.model';
import { ALL_MODELS } from '../src/models';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { seedDemoCatalog } from '../src/seeds/demoCatalog';
import { assertDemoAllowed } from '../src/seeds/runDemo';
import { createFakeModel } from './helpers/fakeModel';

const ARABIC = /[؀-ۿ]/;
type Validatable = new (data: object) => { validate(): Promise<unknown> };

const failingFields = async (model: Validatable, data: object): Promise<string[]> => {
  try {
    await new model(data).validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).sort();
  }
};

const valid = {
  name: { ar: 'قص', en: 'Cut' },
  description: { ar: 'وصف', en: 'Description' },
  imageKey: 'demo/catalog/x.jpg',
  gender: 'MALE',
};

describe('demo catalog data', () => {
  it('has services for women and for men', () => {
    for (const gender of GENDERS) {
      expect(DEMO_SERVICES.filter((s) => s.gender === gender).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('names and describes everything in both languages, Arabic in Arabic script', () => {
    for (const { name, description } of DEMO_SERVICES) {
      for (const text of [name, description]) {
        expect(text.ar).toMatch(ARABIC);
        expect(text.en.length).toBeGreaterThan(0);
        expect(text.en).not.toMatch(ARABIC);
      }
    }
  });

  it('has no duplicate service within an audience (the same name may serve both)', () => {
    const keys = DEMO_SERVICES.map((s) => `${s.gender}/${s.name.en}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('marks every image as demo data and uses plain file names', () => {
    expect(DEMO_IMAGE_PREFIX).toBe('demo/catalog/');
    for (const { image } of DEMO_SERVICES) expect(image).toMatch(/^[a-z-]+\.jpg$/);
  });
});

describe('catalog service model', () => {
  it('is registered and declares the §3.2 indexes', () => {
    expect(ALL_MODELS).toContain(CatalogServiceModel);
    expect(CatalogServiceModel.schema.indexes()).toEqual([
      [{ gender: 1, active: 1, sortOrder: 1 }, expect.anything()],
      [
        { 'name.ar': 'text', 'name.en': 'text' },
        expect.objectContaining({ default_language: 'none' }),
      ],
    ]);
  });

  it('accepts a complete service and defaults to active, sort order 0', async () => {
    expect(await failingFields(CatalogServiceModel, valid)).toEqual([]);
    const doc = new CatalogServiceModel(valid);
    expect([doc.active, doc.sortOrder]).toEqual([true, 0]);
  });

  it('requires name, description, image and a known gender', async () => {
    expect(await failingFields(CatalogServiceModel, {})).toEqual([
      'description',
      'gender',
      'imageKey',
      'name',
    ]);
    expect(await failingFields(CatalogServiceModel, { ...valid, gender: 'OTHER' })).toEqual([
      'gender',
    ]);
    expect(await failingFields(CatalogServiceModel, { ...valid, name: { ar: 'قص' } })).toEqual([
      'name.en',
    ]);
  });
});

const makeRepo = (): { repo: CatalogServicesRepository; docs: Record<string, unknown>[] } => {
  const fake = createFakeModel();
  return {
    repo: new CatalogServicesRepository(fake.model as unknown as Model<CatalogServiceRaw>),
    docs: fake.docs,
  };
};

describe('seedDemoCatalog', () => {
  it('creates every demo service, numbering them per audience from 1', async () => {
    const { repo, docs } = makeRepo();
    expect(await seedDemoCatalog(repo)).toEqual({ created: DEMO_SERVICES.length, existing: 0 });
    for (const gender of GENDERS) {
      const orders = docs.filter((d) => d['gender'] === gender).map((d) => d['sortOrder']);
      expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
    }
    expect(docs.every((d) => String(d['imageKey']).startsWith(DEMO_IMAGE_PREFIX))).toBe(true);
    expect(docs.every((d) => d['active'] === true)).toBe(true);
  });

  it('keeps "Haircut" for women and for men as two services', async () => {
    const { repo, docs } = makeRepo();
    await seedDemoCatalog(repo);
    expect(docs.filter((d) => (d['name'] as { en: string }).en === 'Haircut')).toHaveLength(2);
  });

  it("is idempotent and leaves an admin's edits alone", async () => {
    const { repo, docs } = makeRepo();
    await seedDemoCatalog(repo);
    const makeup = docs.find((d) => (d['name'] as { en: string }).en === 'Makeup');
    Object.assign(makeup ?? {}, { active: false, sortOrder: 99 });
    expect(await seedDemoCatalog(repo)).toEqual({ created: 0, existing: DEMO_SERVICES.length });
    expect(makeup).toMatchObject({ active: false, sortOrder: 99 });
    expect(docs).toHaveLength(DEMO_SERVICES.length);
  });
});

describe('assertDemoAllowed', () => {
  const off = { onStart: false };
  it('refuses production and allows everything else', () => {
    expect(() => {
      assertDemoAllowed({ isProduction: true, demoSeed: off }, 'wab');
    }).toThrow('must not run in production');
    expect(() => {
      assertDemoAllowed({ isProduction: false, demoSeed: off }, 'wab');
    }).not.toThrow();
  });

  it('allows production rules only on the database named in SEED_DEMO_DATABASE (hosted dev)', () => {
    const hostedDev = {
      isProduction: true,
      demoSeed: { onStart: true, allowedDatabase: 'wab-dev' },
    };
    expect(() => {
      assertDemoAllowed(hostedDev, 'wab-dev');
    }).not.toThrow();
    expect(() => {
      assertDemoAllowed(hostedDev, 'wab-prod');
    }).toThrow('SEED_DEMO_DATABASE');
  });
});
