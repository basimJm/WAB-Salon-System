import { loadConfig, type AppConfig } from '../config';
import { ALL_MODELS } from '../models';
import { CatalogServicesRepository } from '../repositories/catalog.repository';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { ensureIndexes } from '../utils/database/indexes';
import { createLogger } from '../utils/logger';
import { seedDemoCatalog } from './demoCatalog';

/** Demo data must never reach production, whatever script is run by mistake. */
export const assertDemoAllowed = (config: Pick<AppConfig, 'isProduction'>): void => {
  if (config.isProduction) throw new Error('the demo seed must not run in production');
};

/** `npm run seed:demo`: sample catalog services for development. */
const main = async (): Promise<void> => {
  const config = loadConfig();
  assertDemoAllowed(config);
  const logger = createLogger({ level: config.logLevel });
  await connectMongo(config, logger);
  try {
    await ensureIndexes(ALL_MODELS, logger);
    const result = await seedDemoCatalog(new CatalogServicesRepository());
    logger.info(result, 'demo catalog seeded');
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
