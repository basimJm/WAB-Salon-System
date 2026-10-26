import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../config';
import { DEMO_FILE_PREFIX, DEMO_IMAGE_FOLDERS } from '../constants/demoSeed';
import { createImageVariants } from '../domain/uploads/variants';
import { UploadModel } from '../models/upload.model';
import { createRealStorage } from '../providers/storage/real';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { escapeRegex } from '../utils/format/regex';
import { createLogger } from '../utils/logger';
import { uploadDemoImages } from './demoImageUpload';
import { isDemoImagePurpose, type DemoImageTarget } from './demoImages';
import { assertDemoAllowed } from './runDemo';

/**
 * `npm run seed:demo-images [-- <folder>]` (development only): writes an image to every key the
 * demo data points at (salon covers, gallery, staff, customers, banners, catalog, licenses): the
 * owner's photo re-encoded as JPEG when the folder has one, else a plain placeholder, so no seeded
 * URL answers 404 (SRV-171 S4); public images also get their list thumbnails. Run it after
 * `seed:demo` (and again after a seed added rows); it rewrites the same keys.
 */
const main = async (): Promise<void> => {
  const folder = process.argv[2];
  const root = folder === undefined ? undefined : resolve(folder);
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  if (config.storage === undefined)
    throw new Error('set STORAGE_PROVIDER=real and the S3/CDN settings first');
  const storage = createRealStorage({
    settings: config.storage,
    isProduction: config.isProduction,
    logger,
  });
  const variants = createImageVariants({ storage, logger });
  const connection = await connectMongo(config, logger);
  try {
    assertDemoAllowed(config, connection.name);
    const uploads = await UploadModel.find(
      { status: 'CONFIRMED', key: { $regex: `^${escapeRegex(DEMO_FILE_PREFIX)}/` } },
      { key: 1, purpose: 1 },
    ).lean();
    const targets: DemoImageTarget[] = uploads.flatMap((upload) =>
      isDemoImagePurpose(upload.purpose) ? [{ key: upload.key, purpose: upload.purpose }] : [],
    );
    const report = await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), {
      storage,
      variants,
      list: (name) => {
        if (root === undefined) return [];
        const path = join(root, name);
        return existsSync(path) ? readdirSync(path) : [];
      },
      read: (path) => readFileSync(join(root ?? '', path)),
    });
    logger.info({ ...report }, 'demo images uploaded');
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
