import sharp from 'sharp';
import {
  IMAGE_VARIANTS,
  VARIANT_CONTENT_TYPE,
  VARIANT_EXTENSION,
  VARIANT_QUALITY,
  VARIANT_SEPARATOR,
  type ImageVariantName,
} from '../../constants/uploads';
import { formatFileRef, objectKeyOf, parseFileRef } from '../../providers/storage/fileRef';
import type { StorageProvider } from '../../providers/storage';
import type { Logger } from '../../utils/logger';

/** `salons/cover/<id>/x.jpg` + `thumb` -> `salons/cover/<id>/x_thumb.webp` (beside the original). */
export const variantKey = (ref: string, name: ImageVariantName): string => {
  // A slot reference keeps its version on the variant (`a/logo?v=3` -> `a/logo_thumb.webp?v=3`).
  const parsed = parseFileRef(ref);
  const { key } = parsed;
  const dot = key.lastIndexOf('.');
  const slash = key.lastIndexOf('/');
  const base = dot > slash ? key.slice(0, dot) : key;
  const variant = `${base}${VARIANT_SEPARATOR}${name}.${VARIANT_EXTENSION}`;
  return parsed.version === null ? variant : formatFileRef(variant, parsed.version);
};

/** Every variant key of an original (to delete them together with it). */
export const variantKeys = (key: string): string[] =>
  IMAGE_VARIANTS.map((variant) => variantKey(key, variant.name));

export interface VariantResult {
  readonly created: string[];
  /** Why nothing was created: the file is gone, or it is not an image the server can read. */
  readonly skipped?: 'MISSING' | 'UNREADABLE';
}

export interface ImageVariants {
  /** Creates the smaller public copies of an image already confirmed in storage. */
  generate(key: string): Promise<VariantResult>;
}

export interface ImageVariantsDeps {
  readonly storage: Pick<StorageProvider, 'read' | 'write'>;
  readonly logger: Logger;
}

/**
 * Thumbnail and medium copies as WebP, never larger than the original, rotated by EXIF and
 * stripped of metadata (location, camera). An unreadable image (e.g. HEIC without a decoder)
 * is skipped with a warning: clients fall back to the original.
 */
export const createImageVariants = ({ storage, logger }: ImageVariantsDeps): ImageVariants => ({
  async generate(ref) {
    // Variants are written under the object key; a slot version only belongs in URLs.
    const key = objectKeyOf(ref);
    const original = await storage.read(key);
    if (original === null) return { created: [], skipped: 'MISSING' };
    const created: string[] = [];
    try {
      for (const variant of IMAGE_VARIANTS) {
        const body = await sharp(original)
          .rotate()
          .resize({ width: variant.width, withoutEnlargement: true })
          .webp({ quality: VARIANT_QUALITY })
          .toBuffer();
        const target = variantKey(key, variant.name);
        await storage.write({
          key: target,
          body,
          contentType: VARIANT_CONTENT_TYPE,
          visibility: 'PUBLIC',
        });
        created.push(target);
      }
    } catch (error) {
      if (created.length === 0) {
        logger.warn({ err: error, key }, 'image could not be read for variants');
        return { created, skipped: 'UNREADABLE' };
      }
      throw error;
    }
    return { created };
  },
});
