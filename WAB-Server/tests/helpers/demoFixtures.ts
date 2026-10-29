import { Types } from 'mongoose';
import { DEMO_IMAGE_PREFIX, DEMO_SERVICES } from '../../src/constants/demoCatalog';
import { DEMO_BRANCHES } from '../../src/constants/demoSeed';
import { SEED_AREAS } from '../../src/constants/referenceData';
import type { DemoBranchSource } from '../../src/seeds/demo/branches';
import { buildDemoDatasetParts } from '../../src/seeds/demo/dataset';
import { demoId } from '../../src/seeds/demo/random';
import { DEMO_COLLECTIONS, type DemoContext, type DemoDoc } from '../../src/seeds/demo/types';
import type { DemoModel } from '../../src/seeds/demo/writer';
import type { DevSeedReport } from '../../src/seeds/devSeed';

/** Shared demo seed fixtures: a fixed context, the base data set and the branch sources. */
export const NOW = new Date('2026-10-26T09:00:00.000Z');
export const TZ = 'Asia/Amman';
export const context: DemoContext = {
  now: NOW,
  timeZone: TZ,
  adminId: new Types.ObjectId(),
  countryCode: 'JO',
  dialCode: '+962',
  cityId: new Types.ObjectId(),
  areaIds: new Map(SEED_AREAS.map((area) => [area.name.en, new Types.ObjectId()])),
  catalog: DEMO_SERVICES.map((service) => ({
    id: new Types.ObjectId(),
    businessType: service.businessType,
    audience: service.audience,
    name: service.name,
    imageKey: `${DEMO_IMAGE_PREFIX}${service.image}`,
  })),
};
export const { data: base, customers } = buildDemoDatasetParts(context);

/** What `loadDemoBranchSources` reads after the migration: LIVE salons and their main services. */
export const sources = new Map<string, DemoBranchSource>(
  [...new Set(DEMO_BRANCHES.map((spec) => spec.salon))].flatMap((key) => {
    const salonId = demoId(`salon:${key}`);
    const salon = base.Salon.find((row) => row._id.equals(salonId));
    if (salon?.['state'] !== 'LIVE') return [];
    const services = base.SalonService.filter(
      (row) => String(row['salonId']) === salonId.toString() && row['active'] === true,
    ).map((row) => ({
      catalogServiceId: row['catalogServiceId'] as Types.ObjectId,
      price: row['price'] as number,
      durationMinutes: row['durationMinutes'] as number,
      brideOnly: row['brideOnly'] === true,
    }));
    return [[key, { salonId, gender: salon['audience'] as DemoBranchSource['gender'], services }]];
  }),
);
const str = (value: unknown): string => String(value);

/** In-memory stand-in for the Mongoose models (rows by id). */
export const memoryModels = (): Map<string, DemoModel & { rows: Map<string, object> }> =>
  new Map(
    DEMO_COLLECTIONS.map((name) => {
      const rows = new Map<string, object>();
      return [
        name,
        {
          modelName: name,
          rows,
          validateDoc: () => null,
          find: (filter: object) => ({
            lean: () => {
              const wanted = (filter as { _id: { $in: Types.ObjectId[] } })._id.$in.map(str);
              return Promise.resolve(
                wanted.filter((id) => rows.has(id)).map((id) => ({ _id: id })),
              );
            },
          }),
          insertMany: (docs: object[]) => {
            for (const doc of docs as DemoDoc[]) rows.set(doc._id.toString(), doc);
            return Promise.resolve(docs);
          },
        },
      ];
    }),
  );

/** A dev seed run that found everything in place and had no admin or storage. */
export const EMPTY_DEV_SEED_REPORT: DevSeedReport = {
  reference: {
    countries: { created: 0, existing: 1 },
    cities: { created: 0, existing: 1 },
    areas: { created: 0, existing: 1 },
  },
  admin: 'skipped',
  demo: 'skipped',
  images: 'skipped',
  reports: 'skipped',
};
