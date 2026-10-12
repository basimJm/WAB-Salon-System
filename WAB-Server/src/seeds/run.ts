import { loadConfig } from '../config';
import { ALL_MODELS } from '../models';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../repositories/locations.repository';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { ensureIndexes } from '../utils/database/indexes';
import { createLogger } from '../utils/logger';
import { seedReferenceData } from './referenceData';

/** `npm run seed`: creates indexes, then inserts the reference data that is missing. */
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
