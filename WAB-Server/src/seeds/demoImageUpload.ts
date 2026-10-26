import sharp from 'sharp';
import {
  DEMO_IMAGE_CONTENT_TYPE,
  DEMO_IMAGE_MAX_WIDTH,
  DEMO_IMAGE_QUALITY,
  DEMO_PLACEHOLDER_BACKGROUND,
  DEMO_PLACEHOLDER_SIZE,
} from '../constants/demoSeed';
import { UPLOAD_POLICIES } from '../constants/uploads';
import type { ImageVariants } from '../domain/uploads/variants';
import type { StorageProvider } from '../providers/storage/types';
import { planDemoImages, type DemoImagePurpose, type DemoImageTarget } from './demoImages';

export interface DemoImageUploadDeps {
  readonly storage: Pick<StorageProvider, 'write'>;
  readonly variants: ImageVariants;
  /** Lists the photo files of one sub-folder (empty when the folder is missing). */
  readonly list: (folder: string) => readonly string[];
  /** Reads one photo, by its path relative to the owner's folder. */
  readonly read: (path: string) => Buffer;
}

export interface DemoImageUploadReport {
  readonly uploaded: number;
  /** Keys that got the generated placeholder because no photo was available for them. */
  readonly placeholders: number;
  readonly placeholdersByPurpose: Readonly<Partial<Record<DemoImagePurpose, number>>>;
}

/** A plain square JPEG for demo keys without a photo, so no seeded URL answers 404 (SRV-171 S4). */
export const demoPlaceholderImage = (): Promise<Buffer> =>
  sharp({
    create: {
      width: DEMO_PLACEHOLDER_SIZE,
      height: DEMO_PLACEHOLDER_SIZE,
      channels: 3,
      background: DEMO_PLACEHOLDER_BACKGROUND,
    },
  })
    .jpeg({ quality: DEMO_IMAGE_QUALITY })
    .toBuffer();

const reencode = (photo: Buffer): Promise<Buffer> =>
  sharp(photo)
    .rotate()
    .resize({ width: DEMO_IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: DEMO_IMAGE_QUALITY })
    .toBuffer();

/**
 * Writes an image to every demo key: the owner's photo when the plan has one, else the
 * placeholder. Public images also get their list thumbnails.
 */
export const uploadDemoImages = async (
  targets: readonly DemoImageTarget[],
  folders: readonly string[],
  deps: DemoImageUploadDeps,
): Promise<DemoImageUploadReport> => {
  const files = new Map(folders.map((folder) => [folder, deps.list(folder)] as const));
  const plan = planDemoImages(targets, files);
  const store = async (key: string, purpose: DemoImagePurpose, body: Buffer): Promise<void> => {
    const visibility = UPLOAD_POLICIES[purpose].visibility;
    await deps.storage.write({ key, body, contentType: DEMO_IMAGE_CONTENT_TYPE, visibility });
    if (visibility === 'PUBLIC') await deps.variants.generate(key);
  };
  for (const item of plan.assignments) {
    await store(item.key, item.purpose, await reencode(deps.read(item.source)));
  }
  const placeholder = plan.missing.length === 0 ? undefined : await demoPlaceholderImage();
  const placeholdersByPurpose: Partial<Record<DemoImagePurpose, number>> = {};
  for (const target of plan.missing) {
    if (placeholder !== undefined) await store(target.key, target.purpose, placeholder);
    placeholdersByPurpose[target.purpose] = (placeholdersByPurpose[target.purpose] ?? 0) + 1;
  }
  return {
    uploaded: plan.assignments.length,
    placeholders: plan.missing.length,
    placeholdersByPurpose,
  };
};
