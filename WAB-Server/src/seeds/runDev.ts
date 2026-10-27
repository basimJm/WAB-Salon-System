import { loadConfig } from '../config';
import { createRealStorage } from '../providers/storage/real';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { createLogger } from '../utils/logger';
import { formatDevSeedSummary, seedDev, summarizeDevSeed } from './devSeed';
import { assertDemoAllowed } from './runDemo';

/**
 * `npm run seed:dev [-- <photo folder>]` (SRV-173): fills a development database in one run —
 * indexes, reference data, the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` when there is none, the
 * demo data with every branch, the demo images + thumbnails and flags (real storage only), then
 * the daily reports. Idempotent. Refused under production rules unless `SEED_DEMO_DATABASE` names
 * the connected database.
 */
const main = async (): Promise<void> => {
  const folder = process.argv[2];
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const connection = await connectMongo(config, logger);
  try {
    assertDemoAllowed(config, connection.name);
    const storage =
      config.storage === undefined
        ? undefined
        : createRealStorage({
            settings: config.storage,
            isProduction: config.isProduction,
            logger,
          });
    const report = await seedDev({
      logger,
      env: process.env,
      ...(storage === undefined ? {} : { storage }),
      ...(folder === undefined ? {} : { folder }),
    });
    process.stdout.write(`${formatDevSeedSummary(summarizeDevSeed(report)).join('\n')}\n`);
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
