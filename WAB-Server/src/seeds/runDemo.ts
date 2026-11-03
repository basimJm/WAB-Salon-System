import { loadConfig, type AppConfig } from '../config';
import { DEMO_REPORT_DAYS } from '../constants/demoSeed';
import { createMongoReportSource } from '../domain/reports/reportSource';
import { createReportsService } from '../domain/reports/reports.service';
import { ALL_MODELS } from '../models';
import { BookingsRepository } from '../repositories/bookings.repository';
import { CatalogServicesRepository } from '../repositories/catalog.repository';
import { CustomersRepository } from '../repositories/identity.repository';
import { PayoutsRepository } from '../repositories/payouts.repository';
import { RefundsRepository } from '../repositories/refunds.repository';
import { ReportsRepository } from '../repositories/reports.repository';
import { ReviewsRepository } from '../repositories/reviews.repository';
import { SalonsRepository } from '../repositories/salons.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { createLogger, type Logger } from '../utils/logger';
import { addDays, localDateOf } from '../utils/time';
import { migrateSalonsToBranches } from '../domain/branches/migration';
import { migrateBusinessTypes } from '../domain/businessTypes/migration';
import { createMongoBusinessTypeMigrationStore } from '../domain/businessTypes/migrationStore';
import { createMongoBranchMigrationStore } from '../domain/branches/migrationStore';
import {
  buildDemoBranchPlans,
  writeDemoBranchPlans,
  type DemoBranchWriteResult,
} from './demo/branchActivity';
import { loadDemoBranchSources, syncBranchCounts, syncDemoRatings } from './demo/branchSources';
import { loadDemoContext } from './demo/context';
import { buildDemoBranches } from './demo/branches';
import {
  createMongoDemoStaffPhotoStore,
  ensureDemoBranchStaffPhotos,
  type DemoBranchPhotosResult,
} from './demo/branchPhotos';
import { buildDemoDatasetParts } from './demo/dataset';
import {
  createMongoDemoBusinessPhotoStore,
  repairDemoBusinessPhotoKeys,
} from './demo/businessPhotos';
import { buildDemoBusinesses } from './demo/businessTypes';
import {
  toDemoModel,
  writeDemoBaseOnce,
  writeDemoDataset,
  type DemoWriteResult,
} from './demo/writer';
import { seedDemoCatalog } from './demoCatalog';
import type { SeedCount, SeedResult } from './referenceData';
import { seedIndexesAndReference } from './run';

/** What decides whether demo data may be written (SRV-160). */
export type DemoSeedConfig = Pick<AppConfig, 'isProduction' | 'demoSeed'>;

/**
 * Demo data must never reach production, whatever script is run by mistake. The hosted DEV service
 * runs `NODE_ENV=production` too: there it is allowed only when `SEED_DEMO_DATABASE` names the
 * database the server is connected to (an explicit, per-database opt-in the prod service never has).
 */
export const assertDemoAllowed = (config: DemoSeedConfig, databaseName: string): void => {
  if (!config.isProduction) return;
  const allowed = config.demoSeed.allowedDatabase;
  if (allowed === undefined) {
    throw new Error(
      'the demo seed must not run in production (a hosted dev service opts in with SEED_DEMO_DATABASE)',
    );
  }
  if (allowed !== databaseName) {
    throw new Error('the demo seed may only write to the database named in SEED_DEMO_DATABASE');
  }
};

/** Stores the daily report of each finished demo day, as the nightly job would have. */
export const storeDailyReports = async (
  timeZone: string,
  now: Date,
  logger: Logger,
): Promise<number> => {
  const reports = createReportsService({
    source: createMongoReportSource({
      bookings: new BookingsRepository(),
      transactions: new TransactionsRepository(),
      refunds: new RefundsRepository(),
      customers: new CustomersRepository(),
      salons: new SalonsRepository(),
      reviews: new ReviewsRepository(),
      subscriptions: new SubscriptionsRepository(),
      payouts: new PayoutsRepository(),
    }),
    reports: new ReportsRepository(),
    settings: { get: () => Promise.resolve(timeZone) } as never,
    logger,
  });
  const today = localDateOf(now, timeZone);
  for (let day = 1; day <= DEMO_REPORT_DAYS; day += 1) await reports.daily(addDays(today, -day));
  return DEMO_REPORT_DAYS;
};

/** What the demo data part of a run wrote (reference data and reports are separate parts). */
export interface DemoDataReport {
  readonly catalog: SeedCount;
  readonly written: DemoWriteResult | 'already seeded';
  readonly branches: unknown;
  readonly extraBranches: DemoBranchWriteResult;
  readonly branchStaffPhotos: DemoBranchPhotosResult;
  /** Clinics and the salon for men and women (§5.19), insert-only by id. */
  readonly businesses: DemoWriteResult;
  /** Demo business staff whose stored photo key was invalid and was replaced (SRV-179). */
  readonly businessPhotoKeysFixed: number;
  /** The time zone the demo days were built in (the reports use the same days). */
  readonly timeZone: string;
  readonly now: Date;
}

/**
 * The demo catalog, then a linked sample data set in every collection (salons, staff, customers,
 * bookings, payments, reviews, content…), then the extra branches with their own staff (with
 * photos), bookings, reviews and notifications (SRV-148, SRV-160, SRV-173). Insert-only and safe
 * to run again: a finished part is skipped and admin edits are never overwritten. Needs the
 * reference data and an admin.
 */
export const seedDemoData = async (now: Date = new Date()): Promise<DemoDataReport> => {
  // Older demo rows carry a gender only: give them their business type first (§5.19).
  await migrateBusinessTypes({ store: createMongoBusinessTypeMigrationStore() });
  const catalog = await seedDemoCatalog(new CatalogServicesRepository());
  const context = await loadDemoContext(now);
  const { data, customers } = buildDemoDatasetParts(context);
  const models = new Map(ALL_MODELS.map((model) => [model.modelName, toDemoModel(model)]));
  const written = await writeDemoBaseOnce(data, models);
  // Demo salons get their main branch the same way existing salons do (§5.16).
  const branches = await migrateSalonsToBranches({
    store: createMongoBranchMigrationStore(),
    dryRun: false,
  });
  // Then two women's and two men's salons get more branches, each with its own staff, services,
  // prices, bookings in every state, reviews and notifications.
  const sources = await loadDemoBranchSources();
  const extraBranches = await writeDemoBranchPlans(
    buildDemoBranchPlans(context, sources, customers),
    models,
  );
  const branchStaffPhotos = await ensureDemoBranchStaffPhotos(
    buildDemoBranches(context, sources),
    models,
    createMongoDemoStaffPhotoStore(),
  );
  // Clinics and a salon for everyone (§5.19); also reaches a database seeded before clinics.
  const businessData = buildDemoBusinesses(context);
  const businesses = await writeDemoDataset(businessData, models);
  const businessPhotoKeysFixed = await repairDemoBusinessPhotoKeys(
    businessData,
    createMongoDemoBusinessPhotoStore(),
  );
  await syncBranchCounts(sources);
  await syncDemoRatings(sources);
  return {
    catalog,
    written,
    branches,
    extraBranches,
    branchStaffPhotos,
    businesses,
    businessPhotoKeysFixed,
    timeZone: context.timeZone,
    now: context.now,
  };
};

/** What one demo seed run did. */
export interface DemoSeedReport {
  readonly reference: SeedResult;
  readonly demo: DemoDataReport;
  readonly reports: number;
}

/**
 * `npm run seed:demo` and the data parts of `seed:dev`: indexes + reference data, the demo data,
 * then the daily reports. Needs the admin from `npm run seed:admin`.
 */
export const seedDemo = async (logger: Logger, now: Date = new Date()): Promise<DemoSeedReport> => {
  const reference = await seedIndexesAndReference(logger);
  const demo = await seedDemoData(now);
  const reports = await storeDailyReports(demo.timeZone, demo.now, logger);
  return { reference, demo, reports };
};

/** `npm run seed:demo` (development, or the hosted dev database named in `SEED_DEMO_DATABASE`). */
const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const connection = await connectMongo(config, logger);
  try {
    assertDemoAllowed(config, connection.name);
    logger.info({ ...(await seedDemo(logger)) }, 'demo data seeded');
  } finally {
    await disconnectMongo();
  }
};

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
