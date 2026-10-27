import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../config';
import { DEMO_FILE_PREFIX, DEMO_IMAGE_FOLDERS } from '../constants/demoSeed';
import { createImageVariants } from '../domain/uploads/variants';
import { UploadModel } from '../models/upload.model';
import { createRealStorage } from '../providers/storage/real';
import type { StorageProvider } from '../providers/storage/types';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { escapeRegex } from '../utils/format/regex';
import { createLogger, type Logger } from '../utils/logger';
import { uploadDemoImages, type DemoImageUploadReport } from './demoImageUpload';
import { uploadSeedFlags, type FlagImagesReport } from './flagImages';
import { isDemoImagePurpose, type DemoImageTarget } from './demoImages';
import { assertDemoAllowed } from './runDemo';

/** Every demo file key the stored data points at (its confirmed upload records). */
export const loadDemoImageTargets = async (): Promise<DemoImageTarget[]> => {
  const uploads = await UploadModel.find(
    { status: 'CONFIRMED', key: { $regex: `^${escapeRegex(DEMO_FILE_PREFIX)}/` } },
    { key: 1, purpose: 1 },
  ).lean();
  return uploads.flatMap((upload) =>
    isDemoImagePurpose(upload.purpose) ? [{ key: upload.key, purpose: upload.purpose }] : [],
  );
};

export interface DemoImagesDeps {
  readonly storage: Pick<StorageProvider, 'read' | 'write'>;
  readonly logger: Logger;
  /** The owner's photo folder (sub-folders per kind); placeholders only when absent. */
  readonly folder?: string;
  /** The demo keys to fill (tests pass them; the scripts read them from the upload records). */
  readonly targets?: () => Promise<readonly DemoImageTarget[]>;
}

export interface DemoImagesReport {
  readonly images: DemoImageUploadReport;
  readonly flags: FlagImagesReport;
}

/**
 * An image for every demo key (the owner's photo when the folder has one, else a placeholder
 * where storage holds nothing yet) with list thumbnails for public images, then the seeded
 * countries' flags (SRV-171 S4, SRV-172, SRV-173). Safe to run again.
 */
export const seedDemoImages = async (deps: DemoImagesDeps): Promise<DemoImagesReport> => {
  const root = deps.folder === undefined ? undefined : resolve(deps.folder);
  const variants = createImageVariants({ storage: deps.storage, logger: deps.logger });
  const targets = await (deps.targets ?? loadDemoImageTargets)();
  const images = await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), {
    storage: deps.storage,
    variants,
    list: (name) => {
      if (root === undefined) return [];
      const path = join(root, name);
      return existsSync(path) ? readdirSync(path) : [];
    },
    read: (path) => readFileSync(join(root ?? '', path)),
  });
  const flags = await uploadSeedFlags(deps.storage);
  return { images, flags };
};

/**
 * `npm run seed:demo-images [-- <folder>]` (development only): writes an image to every key the
 * demo data points at (salon covers, gallery, staff incl. branch staff, customers, banners,
 * catalog, licenses) and the country flags. Run it after `seed:demo`; `seed:dev` runs it too.
 */
const main = async (): Promise<void> => {
  const folder = process.argv[2];
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  if (config.storage === undefined)
    throw new Error('set STORAGE_PROVIDER=real and the S3/CDN settings first');
  const storage = createRealStorage({
    settings: config.storage,
    isProduction: config.isProduction,
    logger,
  });
  const connection = await connectMongo(config, logger);
  try {
    assertDemoAllowed(config, connection.name);
    const report = await seedDemoImages({
      storage,
      logger,
      ...(folder === undefined ? {} : { folder }),
    });
    logger.info({ ...report.images }, 'demo images uploaded');
    logger.info({ ...report.flags }, 'country flags written');
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
