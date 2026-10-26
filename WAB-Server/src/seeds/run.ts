import { loadConfig } from '../config';
import { ALL_MODELS } from '../models';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../repositories/locations.repository';
import { createRealStorage } from '../providers/storage/real';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { ensureIndexes } from '../utils/database/indexes';
import { createLogger } from '../utils/logger';
import { uploadSeedFlags } from './flagImages';
import { seedReferenceData } from './referenceData';

/**
 * `npm run seed`: creates indexes, inserts the reference data that is missing and, with real
 * storage configured, writes the shipped country flags to their keys (SRV-172).
 */
const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  await connectMongo(config, logger);
  try {
    await ensureIndexes(ALL_MODELS, logger);
    const result = await seedReferenceData({
      countries: new CountriesRepository(),
      cities: new CitiesRepository(),
      areas: new AreasRepository(),
    });
    logger.info(result, 'reference data seeded');
    if (config.storage === undefined) {
      logger.warn('flags not written: set STORAGE_PROVIDER=real and the S3/CDN settings');
    } else {
      const storage = createRealStorage({
        settings: config.storage,
        isProduction: config.isProduction,
        logger,
      });
      logger.info({ ...(await uploadSeedFlags(storage)) }, 'country flags written');
    }
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
