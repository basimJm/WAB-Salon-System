import { DEMO_BUSINESSES } from '../src/constants/demoBusinessTypes';
import { AUDIENCES, BUSINESS_TYPES, type Gender } from '../src/constants/enums';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { BUSINESS_TYPE_MIGRATION_TARGETS } from '../src/constants/businessTypes';
import {
  BUSINESS_TYPE_FIELD_MOVES,
  migrateBusinessTypes,
  type BusinessTypeFieldMove,
  type BusinessTypeMigrationStore,
} from '../src/domain/businessTypes/migration';
import {
  audienceFor,
  brideAllowed,
  type BusinessKind,
  catalogAudiencesFor,
  catalogFits,
  isVisibleTo,
  isWidening,
  personFits,
  visibleAudiences,
} from '../src/domain/businessTypes/rules';
import { BookingModel } from '../src/models/booking.model';
import { CatalogServiceModel } from '../src/models/catalogService.model';
import { RecommendedPlacementModel } from '../src/models/recommendedPlacement.model';
import { SalonModel } from '../src/models/salon.model';
import { buildDemoBusinesses, demoBusinessId } from '../src/seeds/demo/businessTypes';
import {
  invalidPhotoKeyFilter,
  repairDemoBusinessPhotoKeys,
  type DemoBusinessPhoto,
} from '../src/seeds/demo/businessPhotos';
import { assertObjectKey } from '../src/providers/storage/validation';
import { OBJECT_KEY_PATTERN } from '../src/constants/providers';
import { writeDemoDataset } from '../src/seeds/demo/writer';
import { DEMO_COLLECTIONS } from '../src/seeds/demo/types';
import ar from '../src/locales/ar.json';
import en from '../src/locales/en.json';
import { context, memoryModels } from './helpers/demoFixtures';

const SALON = 'SALON' as const;
const CLINIC = 'CLINIC' as const;

describe('business type rules (§5.19)', () => {
  it('a customer sees salons of their gender or BOTH and every clinic', () => {
    expect(visibleAudiences('MALE')).toEqual(['MALE', 'BOTH']);
    expect(isVisibleTo({ audience: 'MALE' }, 'MALE')).toBe(true);
    expect(isVisibleTo({ audience: 'FEMALE' }, 'MALE')).toBe(false);
    expect(isVisibleTo({ audience: 'BOTH' }, 'FEMALE')).toBe(true);
    // A clinic is always BOTH, so every customer sees it.
    for (const gender of ['MALE', 'FEMALE'] as Gender[]) {
      expect(isVisibleTo({ audience: audienceFor(CLINIC, 'MALE') }, gender)).toBe(true);
    }
  });

  it('a clinic is always BOTH; a salon keeps its audience', () => {
    for (const audience of AUDIENCES) {
      expect(audienceFor(CLINIC, audience)).toBe('BOTH');
      expect(audienceFor(SALON, audience)).toBe(audience);
    }
  });

  it('catalog services fit only their own business type and a fitting audience', () => {
    const kind = (
      businessType: 'SALON' | 'CLINIC',
      audience: 'MALE' | 'FEMALE' | 'BOTH',
    ): BusinessKind => ({
      businessType,
      audience,
    });
    expect(catalogFits(kind(SALON, 'MALE'), kind(SALON, 'MALE'))).toBe(true);
    expect(catalogFits(kind(SALON, 'MALE'), kind(SALON, 'FEMALE'))).toBe(false);
    expect(catalogFits(kind(SALON, 'MALE'), kind(SALON, 'BOTH'))).toBe(true);
    expect(catalogFits(kind(SALON, 'BOTH'), kind(SALON, 'FEMALE'))).toBe(true);
    expect(catalogFits(kind(CLINIC, 'BOTH'), kind(SALON, 'BOTH'))).toBe(false);
    expect(catalogFits(kind(SALON, 'FEMALE'), kind(CLINIC, 'BOTH'))).toBe(false);
    expect(catalogFits(kind(CLINIC, 'BOTH'), kind(CLINIC, 'BOTH'))).toBe(true);
    expect(catalogAudiencesFor({ audience: 'BOTH' })).toEqual(['MALE', 'FEMALE', 'BOTH']);
    expect(catalogAudiencesFor({ audience: 'FEMALE' })).toEqual(['FEMALE', 'BOTH']);
  });

  it('brides only at FEMALE and BOTH salons, never clinics or men’s salons', () => {
    expect(brideAllowed({ businessType: SALON, audience: 'FEMALE' })).toBe(true);
    expect(brideAllowed({ businessType: SALON, audience: 'BOTH' })).toBe(true);
    expect(brideAllowed({ businessType: SALON, audience: 'MALE' })).toBe(false);
    expect(brideAllowed({ businessType: CLINIC, audience: 'BOTH' })).toBe(false);
  });

  it('mixed persons only for BOTH businesses; single-gender salons take their own gender', () => {
    expect(personFits({ audience: 'BOTH' }, 'MALE')).toBe(true);
    expect(personFits({ audience: 'BOTH' }, 'FEMALE')).toBe(true);
    expect(personFits({ audience: 'MALE' }, 'FEMALE')).toBe(false);
    expect(personFits({ audience: 'FEMALE' }, 'FEMALE')).toBe(true);
  });

  it('only MALE/FEMALE → BOTH is a widening', () => {
    expect(isWidening('MALE', 'BOTH')).toBe(true);
    expect(isWidening('FEMALE', 'BOTH')).toBe(true);
    expect(isWidening('BOTH', 'MALE')).toBe(false);
    expect(isWidening('MALE', 'FEMALE')).toBe(false);
  });

  it('error codes exist with Arabic and English messages', () => {
    for (const code of [
      ERROR_CODES.BUSINESS_TYPE_MISMATCH,
      ERROR_CODES.AUDIENCE_CHANGE_NOT_ALLOWED,
      ERROR_CODES.BRIDE_NOT_ALLOWED,
    ]) {
      expect((ar as Record<string, string>)[`errors.${code}`]).toMatch(/\S/);
      expect((en as Record<string, string>)[`errors.${code}`]).toMatch(/\S/);
    }
  });
});

describe('schemas carry business type + audience instead of gender', () => {
  it.each([
    ['salon', SalonModel, ['businessType', 'audience']],
    ['catalog service', CatalogServiceModel, ['businessType', 'audience']],
    ['placement', RecommendedPlacementModel, ['businessType', 'audience']],
    ['booking', BookingModel, ['businessType', 'salonAudience']],
  ] as const)('%s', (_name, model, fields) => {
    const schema = model.schema as unknown as { path(name: string): unknown };
    for (const field of fields) expect(schema.path(field)).toBeDefined();
    expect(schema.path('gender')).toBeUndefined();
    expect(schema.path('salonGender')).toBeUndefined();
    const paths = schema.path(fields[0]) as { enumValues: string[] };
    expect(paths.enumValues).toEqual([...BUSINESS_TYPES]);
  });
});

/** In-memory rows per target, with the same filter the Mongo store uses. */
const memoryStore = (
  rows: Record<string, Record<string, unknown>[]>,
): BusinessTypeMigrationStore => {
  const pending = (
    target: string,
    move: BusinessTypeFieldMove,
    value: string,
  ): Record<string, unknown>[] =>
    (rows[target] ?? []).filter((r) => r['businessType'] === undefined && r[move.from] === value);
  return {
    countPending: (target, move, value) => Promise.resolve(pending(target, move, value).length),
    migrate(target, move, value) {
      const found = pending(target, move, value);
      for (const row of found) {
        row['businessType'] = 'SALON';
        row[move.to] = value;
        Reflect.deleteProperty(row, move.from);
      }
      return Promise.resolve(found.length);
    },
  };
};

describe('migrateBusinessTypes (§5.19 migration)', () => {
  const fresh = (): Record<string, Record<string, unknown>[]> => ({
    salons: [
      { gender: 'MALE' },
      { gender: 'FEMALE' },
      { businessType: 'CLINIC', audience: 'BOTH' },
    ],
    catalogServices: [{ gender: 'FEMALE' }],
    recommendedPlacements: [{ gender: 'MALE' }],
    bookings: [{ salonGender: 'FEMALE' }, { salonGender: 'MALE' }],
  });

  it('moves every old gender to SALON + audience and leaves new rows alone', async () => {
    const rows = fresh();
    const report = await migrateBusinessTypes({ store: memoryStore(rows) });
    expect(report).toEqual({
      salons: 2,
      catalogServices: 1,
      recommendedPlacements: 1,
      bookings: 2,
    });
    expect(rows['salons']).toEqual([
      { businessType: 'SALON', audience: 'MALE' },
      { businessType: 'SALON', audience: 'FEMALE' },
      { businessType: 'CLINIC', audience: 'BOTH' },
    ]);
    expect(rows['bookings']?.[0]).toEqual({ businessType: 'SALON', salonAudience: 'FEMALE' });
  });

  it('is idempotent: a second run changes nothing', async () => {
    const rows = fresh();
    await migrateBusinessTypes({ store: memoryStore(rows) });
    const snapshot = JSON.stringify(rows);
    const again = await migrateBusinessTypes({ store: memoryStore(rows) });
    expect(Object.values(again).every((n) => n === 0)).toBe(true);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it('a dry run counts without writing', async () => {
    const rows = fresh();
    const report = await migrateBusinessTypes({ store: memoryStore(rows), dryRun: true });
    expect(report.salons).toBe(2);
    expect(rows['salons']?.[0]).toEqual({ gender: 'MALE' });
  });

  it('covers every collection that had a gender', () => {
    expect(Object.keys(BUSINESS_TYPE_FIELD_MOVES).sort()).toEqual(
      [...BUSINESS_TYPE_MIGRATION_TARGETS].sort(),
    );
    expect(BUSINESS_TYPE_FIELD_MOVES.bookings).toEqual({
      from: 'salonGender',
      to: 'salonAudience',
    });
  });
});

describe('demo businesses: clinics and a salon for everyone (§5.19)', () => {
  const data = buildDemoBusinesses(context);

  it('two clinics with two branches each and one BOTH salon, LIVE and complete', () => {
    const salons = data.Salon;
    expect(salons.filter((s) => s['businessType'] === 'CLINIC')).toHaveLength(2);
    expect(
      salons.filter((s) => s['businessType'] === 'SALON' && s['audience'] === 'BOTH'),
    ).toHaveLength(1);
    for (const salon of salons) {
      expect(salon['state']).toBe('LIVE');
      expect(salon['completeness']).toEqual({ missing: [], isComplete: true });
      if (salon['businessType'] !== 'SALON') expect(salon['audience']).toBe('BOTH');
    }
    for (const spec of DEMO_BUSINESSES.filter((s) => s.businessType === 'CLINIC')) {
      const branches = data.Branch.filter(
        (b) => String(b['salonId']) === String(demoBusinessId(spec.key)),
      );
      expect(branches).toHaveLength(2);
      expect(branches.filter((b) => b['isMain'] === true)).toHaveLength(1);
    }
  });

  it('offers only catalog services of the business type, staff without bride flags at clinics', () => {
    const catalogById = new Map(context.catalog.map((c) => [String(c.id), c]));
    for (const service of data.SalonService) {
      const salon = data.Salon.find((s) => String(s['_id']) === String(service['salonId']));
      const entry = catalogById.get(String(service['catalogServiceId']));
      expect(entry?.businessType).toBe(salon?.['businessType']);
      expect(service['brideOnly']).toBe(false);
    }
    for (const member of data.Member) {
      const salon = data.Salon.find((s) => String(s['_id']) === String(member['salonId']));
      const staff = member['staff'] as { brideQualified: boolean } | undefined;
      if (salon?.['businessType'] !== 'SALON') expect(staff?.brideQualified ?? false).toBe(false);
    }
    expect(data.RecommendedPlacement.map((p) => p['businessType']).sort()).toEqual([
      'CLINIC',
      'SALON',
      'TATTOO',
    ]);
  });

  it('every stored file key is a valid storage key (SRV-179: no ":" from branch labels)', () => {
    const keys = [
      ...data.Member.map((m) => m['photoKey']),
      ...data.Salon.flatMap((s) => [s['coverKey'], s['profileKey']]),
      ...data.Upload.map((u) => u['key']),
    ].filter((key): key is string => typeof key === 'string');
    expect(keys.length).toBeGreaterThan(data.Member.length);
    for (const key of keys) {
      expect(() => {
        assertObjectKey(key);
      }).not.toThrow();
    }
  });

  it('repairs only invalid stored photo keys of the demo business staff (SRV-179)', async () => {
    const seen: DemoBusinessPhoto[] = [];
    const fixed = await repairDemoBusinessPhotoKeys(data, {
      replaceInvalidPhotoKeys: (rows) => {
        seen.push(...rows);
        return Promise.resolve(rows.length);
      },
    });
    const staffWithPhotos = data.Member.filter((m) => typeof m['photoKey'] === 'string');
    expect(fixed).toBe(staffWithPhotos.length);
    expect(seen.map((r) => String(r.id))).toEqual(staffWithPhotos.map((m) => String(m._id)));
    const [first] = staffWithPhotos;
    if (first === undefined) throw new Error('demo businesses have staff');
    const filter = invalidPhotoKeyFilter(first._id);
    const pattern = (filter['photoKey'] as { $not: RegExp }).$not;
    expect(pattern).toBe(OBJECT_KEY_PATTERN);
    expect(pattern.test('demo/members/business-glow-clinic-abdoun:staff0.jpg')).toBe(false);
    expect(pattern.test('demo/members/business-glow-clinic-abdoun-staff0.jpg')).toBe(true);
  });

  it('every row is valid and a second run writes nothing', async () => {
    const models = memoryModels();
    const first = await writeDemoDataset(data, models);
    expect(Object.values(first).some((c) => c.created > 0)).toBe(true);
    const second = await writeDemoDataset(buildDemoBusinesses(context), models);
    for (const collection of DEMO_COLLECTIONS) expect(second[collection].created).toBe(0);
  });
});
