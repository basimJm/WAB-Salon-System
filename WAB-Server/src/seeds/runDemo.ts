import { loadConfig, type AppConfig } from '../config';
import { DEMO_REPORT_DAYS } from '../constants/demoSeed';
import { createMongoReportSource } from '../domain/reports/reportSource';
import { createReportsService } from '../domain/reports/reports.service';
import { ALL_MODELS } from '../models';
import { BookingsRepository } from '../repositories/bookings.repository';
import { CatalogServicesRepository } from '../repositories/catalog.repository';
import { CustomersRepository } from '../repositories/identity.repository';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../repositories/locations.repository';
import { PayoutsRepository } from '../repositories/payouts.repository';
import { RefundsRepository } from '../repositories/refunds.repository';
import { ReportsRepository } from '../repositories/reports.repository';
import { ReviewsRepository } from '../repositories/reviews.repository';
import { SalonsRepository } from '../repositories/salons.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { ensureIndexes } from '../utils/database/indexes';
import { createLogger, type Logger } from '../utils/logger';
import { addDays, localDateOf } from '../utils/time';
import { loadDemoContext } from './demo/context';
import { buildDemoDataset } from './demo/dataset';
import { toDemoModel, writeDemoDataset } from './demo/writer';
import { seedDemoCatalog } from './demoCatalog';
import { seedReferenceData } from './referenceData';

/** Demo data must never reach production, whatever script is run by mistake. */
export const assertDemoAllowed = (config: Pick<AppConfig, 'isProduction'>): void => {
  if (config.isProduction) throw new Error('the demo seed must not run in production');
};

/** Stores the daily report of each finished demo day, as the nightly job would have. */
const storeDailyReports = async (timeZone: string, now: Date, logger: Logger): Promise<number> => {
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

/**
 * `npm run seed:demo` (development only): reference data and demo catalog, then a linked sample
 * data set in every collection (salons, staff, customers, bookings, payments, reviews, content…).
 * Insert-only and deterministic: running it again adds nothing and never overwrites admin edits.
 * Needs the admin from `npm run seed:admin`.
 */
const main = async (): Promise<void> => {
  const config = loadConfig();
  assertDemoAllowed(config);
  const logger = createLogger({ level: config.logLevel });
  await connectMongo(config, logger);
  try {
    await ensureIndexes(ALL_MODELS, logger);
    const reference = await seedReferenceData({
      countries: new CountriesRepository(),
      cities: new CitiesRepository(),
      areas: new AreasRepository(),
    });
    const catalog = await seedDemoCatalog(new CatalogServicesRepository());
    const context = await loadDemoContext();
    const dataset = buildDemoDataset(context);
    const models = new Map(ALL_MODELS.map((model) => [model.modelName, toDemoModel(model)]));
    const written = await writeDemoDataset(dataset, models);
    const reports = await storeDailyReports(context.timeZone, context.now, logger);
    logger.info({ reference, catalog, written, reports }, 'demo data seeded');
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
