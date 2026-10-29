import { loadConfig } from '../config';
import { MIGRATION_APPLY_FLAG } from '../constants/businessTypes';
import { migrateBusinessTypes } from '../domain/businessTypes/migration';
import { createMongoBusinessTypeMigrationStore } from '../domain/businessTypes/migrationStore';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { createLogger } from '../utils/logger';

/**
 * `npm run migrate:business-types [-- --apply]` (every environment): existing salons, catalog
 * services, placements and bookings get `businessType = SALON` and their gender as the audience
 * (BUSINESS_DOMAIN.md §5.19). A dry run by default; idempotent when applied. The server also runs
 * it (applied) at every start.
 */
const main = async (): Promise<void> => {
  const dryRun = !process.argv.includes(MIGRATION_APPLY_FLAG);
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  await connectMongo(config, logger);
  try {
    await migrateBusinessTypes({
      store: createMongoBusinessTypeMigrationStore(),
      dryRun,
      logger,
    });
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
