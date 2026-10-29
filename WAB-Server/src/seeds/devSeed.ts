import { ADMIN_SEED_ENV } from '../constants/adminSeed';
import { ENV_KEYS } from '../constants/env';
import type { StorageProvider } from '../providers/storage/types';
import { AdminsRepository } from '../repositories/identity.repository';
import type { Logger } from '../utils/logger';
import { seedAdmin } from './admin';
import type { SeedCount, SeedResult } from './referenceData';
import { seedDemoData, storeDailyReports, type DemoDataReport } from './runDemo';
import { seedDemoImages, type DemoImagesReport } from './runDemoImages';
import { seedIndexesAndReference } from './run';

/** What the admin part did: made one from the env, found one, or had neither. */
export type DevSeedAdmin = 'created' | 'existing' | 'skipped';

/** The parts of a full development seed, in the order `runDevSeed` calls them. */
export interface DevSeedSteps {
  /** Indexes + reference data (countries, cities, areas). */
  reference(): Promise<SeedResult>;
  admin(): Promise<DevSeedAdmin>;
  /** Demo catalog, the demo data set, the extra branches and their staff photos. */
  demo(): Promise<DemoDataReport>;
  /** Demo images + thumbnails and the flags; `undefined` when no storage is configured. */
  readonly images?: () => Promise<DemoImagesReport>;
  reports(demo: DemoDataReport): Promise<number>;
}

export const DEV_SEED_SKIPPED = 'skipped';

export interface DevSeedReport {
  readonly reference: SeedResult;
  readonly admin: DevSeedAdmin;
  readonly demo: DemoDataReport | typeof DEV_SEED_SKIPPED;
  readonly images: DemoImagesReport | typeof DEV_SEED_SKIPPED;
  readonly reports: number | typeof DEV_SEED_SKIPPED;
}

/**
 * One run fills a development database (SRV-173): reference data, the admin (when the env names
 * one), the demo data with every branch, then the images, then the daily reports. Every part is
 * idempotent, so the whole run is too. Without an admin the demo parts are skipped (the demo data
 * hangs on one); without storage the images are skipped. Both are logged as warnings.
 */
export const runDevSeed = async (steps: DevSeedSteps, logger: Logger): Promise<DevSeedReport> => {
  const reference = await steps.reference();
  const admin = await steps.admin();
  let demo: DevSeedReport['demo'] = DEV_SEED_SKIPPED;
  if (admin === 'skipped') {
    logger.warn(
      `demo data skipped: no admin yet (set ${ADMIN_SEED_ENV.email} and ${ADMIN_SEED_ENV.password}, or run \`npm run seed:admin\`)`,
    );
  } else {
    demo = await steps.demo();
  }
  let images: DevSeedReport['images'] = DEV_SEED_SKIPPED;
  if (steps.images === undefined) {
    logger.warn(
      `demo images and flags skipped: set ${ENV_KEYS.storageProvider}=real and the S3/CDN settings (the data is seeded)`,
    );
  } else {
    images = await steps.images();
  }
  const reports = demo === DEV_SEED_SKIPPED ? DEV_SEED_SKIPPED : await steps.reports(demo);
  return { reference, admin, demo, images, reports };
};

export interface DevSeedDeps {
  readonly logger: Logger;
  /** Real storage (S3 / MinIO); absent = images skipped. */
  readonly storage?: Pick<StorageProvider, 'read' | 'write'>;
  /** The owner's photo folder for the demo images (optional). */
  readonly folder?: string;
  /** Where `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read (never logged). */
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
}

/** The admin from the env when there is none yet; an existing admin is never touched. */
const ensureAdmin = async (env: DevSeedDeps['env']): Promise<DevSeedAdmin> => {
  const admins = new AdminsRepository();
  if ((await admins.count({})) > 0) return 'existing';
  const email = env[ADMIN_SEED_ENV.email] ?? '';
  const password = env[ADMIN_SEED_ENV.password] ?? '';
  if (email === '' || password === '') return 'skipped';
  await seedAdmin({ admins, email, password });
  return 'created';
};

/** The real parts over the open MongoDB connection (the scripts and the startup seed). */
export const createDevSeedSteps = (deps: DevSeedDeps): DevSeedSteps => {
  const { storage, logger } = deps;
  return {
    reference: () => seedIndexesAndReference(logger),
    admin: () => ensureAdmin(deps.env),
    demo: () => seedDemoData(deps.now),
    ...(storage === undefined
      ? {}
      : {
          images: () =>
            seedDemoImages({
              storage,
              logger,
              ...(deps.folder === undefined ? {} : { folder: deps.folder }),
            }),
        }),
    reports: (demo) => storeDailyReports(demo.timeZone, demo.now, logger),
  };
};

/** `npm run seed:dev` and `SEED_DEMO_ON_START`: the full development seed. */
export const seedDev = (deps: DevSeedDeps): Promise<DevSeedReport> =>
  runDevSeed(createDevSeedSteps(deps), deps.logger);

const total = (counts: readonly SeedCount[]): SeedCount => ({
  created: counts.reduce((sum, count) => sum + count.created, 0),
  existing: counts.reduce((sum, count) => sum + count.existing, 0),
});

/** Counts per part (no keys, ids, names or secrets), for the log and the console. */
export interface DevSeedSummary {
  readonly reference: SeedCount;
  readonly admin: DevSeedAdmin;
  readonly catalog?: SeedCount;
  /** `already seeded` when an earlier run finished the base data set. */
  readonly demoRows?: SeedCount | 'already seeded';
  readonly branchesWritten?: number;
  readonly branchesAlreadyThere?: number;
  readonly branchStaffPhotosSet?: number;
  /** Clinics + the salon for everyone (§5.19): rows written / already there. */
  readonly businessRows?: SeedCount;
  readonly images?: {
    readonly photos: number;
    readonly placeholders: number;
    readonly alreadyStored: number;
  };
  readonly flags?: {
    readonly written: number;
    readonly unchanged: number;
    readonly missing: number;
  };
  readonly reports?: number;
}

export const summarizeDevSeed = (report: DevSeedReport): DevSeedSummary => {
  const { demo, images } = report;
  return {
    reference: total([report.reference.countries, report.reference.cities, report.reference.areas]),
    admin: report.admin,
    ...(demo === DEV_SEED_SKIPPED
      ? {}
      : {
          catalog: demo.catalog,
          demoRows:
            demo.written === 'already seeded'
              ? demo.written
              : total([...Object.values(demo.written), demo.branchStaffPhotos.uploads]),
          branchesWritten: demo.extraBranches.written.length,
          branchesAlreadyThere: demo.extraBranches.skipped.length,
          branchStaffPhotosSet: demo.branchStaffPhotos.photoKeysSet,
          businessRows: total(Object.values(demo.businesses)),
        }),
    ...(images === DEV_SEED_SKIPPED
      ? {}
      : {
          images: {
            photos: images.images.uploaded,
            placeholders: images.images.placeholders,
            alreadyStored: images.images.existing,
          },
          flags: {
            written: images.flags.uploaded,
            unchanged: images.flags.unchanged,
            missing: images.flags.missing.length,
          },
        }),
    ...(report.reports === DEV_SEED_SKIPPED ? {} : { reports: report.reports }),
  };
};

/** The summary as short console lines. */
export const formatDevSeedSummary = (summary: DevSeedSummary): string[] => {
  const count = (value: SeedCount): string =>
    `${String(value.created)} created, ${String(value.existing)} already there`;
  const skipped = 'skipped';
  return [
    `reference data: ${count(summary.reference)}`,
    `admin: ${summary.admin}`,
    `demo catalog: ${summary.catalog === undefined ? skipped : count(summary.catalog)}`,
    `demo data rows: ${
      summary.demoRows === undefined
        ? skipped
        : typeof summary.demoRows === 'string'
          ? summary.demoRows
          : count(summary.demoRows)
    }`,
    `extra branches: ${
      summary.branchesWritten === undefined
        ? skipped
        : `${String(summary.branchesWritten)} written, ${String(summary.branchesAlreadyThere ?? 0)} already there, ${String(summary.branchStaffPhotosSet ?? 0)} staff photo keys added`
    }`,
    `demo images: ${
      summary.images === undefined
        ? `${skipped} (no storage)`
        : `${String(summary.images.photos)} photos, ${String(summary.images.placeholders)} placeholders, ${String(summary.images.alreadyStored)} already stored`
    }`,
    `country flags: ${
      summary.flags === undefined
        ? `${skipped} (no storage)`
        : `${String(summary.flags.written)} written, ${String(summary.flags.unchanged)} unchanged, ${String(summary.flags.missing)} without a shipped file`
    }`,
    `daily reports: ${summary.reports === undefined ? skipped : String(summary.reports)}`,
  ];
};
