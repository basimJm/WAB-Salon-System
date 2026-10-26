import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { loadConfig } from '../config';
import {
  DEMO_FILE_PREFIX,
  DEMO_IMAGE_CONTENT_TYPE,
  DEMO_IMAGE_FOLDERS,
  DEMO_IMAGE_MAX_WIDTH,
  DEMO_IMAGE_QUALITY,
} from '../constants/demoSeed';
import { UPLOAD_POLICIES } from '../constants/uploads';
import { createImageVariants } from '../domain/uploads/variants';
import { UploadModel } from '../models/upload.model';
import { createRealStorage } from '../providers/storage/real';
import { connectMongo, disconnectMongo } from '../utils/database/connection';
import { escapeRegex } from '../utils/format/regex';
import { createLogger } from '../utils/logger';
import { isDemoImagePurpose, planDemoImages, type DemoImageTarget } from './demoImages';
import { assertDemoAllowed } from './runDemo';

/**
 * `npm run seed:demo-images -- <folder>` (development only): uploads the owner's photos to the
 * keys the demo data points at (salon covers, gallery, staff, customers, banners, catalog,
 * licenses), re-encoded as JPEG, plus the list thumbnails. Run it after `seed:demo`; running it
 * again uploads the same photos to the same keys.
 */
const main = async (): Promise<void> => {
  const folder = process.argv[2];
  if (folder === undefined) throw new Error('usage: npm run seed:demo-images -- <photo folder>');
  const root = resolve(folder);
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
    const files = new Map(
      Object.values(DEMO_IMAGE_FOLDERS).map((name) => {
        const path = join(root, name);
        return [name, existsSync(path) ? readdirSync(path) : []] as const;
      }),
    );
    const plan = planDemoImages(targets, files);
    let uploaded = 0;
    for (const item of plan.assignments) {
      const body = await sharp(readFileSync(join(root, item.source)))
        .rotate()
        .resize({ width: DEMO_IMAGE_MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: DEMO_IMAGE_QUALITY })
        .toBuffer();
      const visibility = UPLOAD_POLICIES[item.purpose].visibility;
      await storage.write({
        key: item.key,
        body,
        contentType: DEMO_IMAGE_CONTENT_TYPE,
        visibility,
      });
      if (visibility === 'PUBLIC') await variants.generate(item.key);
      uploaded += 1;
    }
    const missingByFolder = Object.fromEntries(
      Object.entries(DEMO_IMAGE_FOLDERS).map(([purpose, name]) => [
        name,
        plan.missing.filter((target) => target.purpose === purpose).length,
      ]),
    );
    logger.info({ uploaded, missingByFolder }, 'demo images uploaded');
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
