import { loadConfig } from '../config';
import { migrateSalonsToBranches } from '../domain/branches/migration';
import { createMongoBranchMigrationStore } from '../domain/branches/migrationStore';
import { ALL_MODELS } from '../models';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { ensureIndexes } from '../utils/database/indexes';
import { createLogger } from '../utils/logger';

/** Writes only with this flag; without it the run reports what it would change. */
export const APPLY_FLAG = '--apply';

/**
 * `npm run migrate:branches [-- --apply]` (every environment): gives each salon without branches
 * one main branch from its current address, contacts, hours, services and staff, and points all
 * its rows at it (BUSINESS_DOMAIN.md §5.16). A dry run by default; idempotent when applied.
 */
const main = async (): Promise<void> => {
  const dryRun = !process.argv.includes(APPLY_FLAG);
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  await connectMongo(config, logger);
  try {
    await ensureIndexes(ALL_MODELS, logger);
    const report = await migrateSalonsToBranches({
      store: createMongoBranchMigrationStore(),
      dryRun,
      logger,
    });
    logger.info(
      report,
      dryRun ? 'branch migration (dry run, nothing written)' : 'branch migration applied',
    );
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
