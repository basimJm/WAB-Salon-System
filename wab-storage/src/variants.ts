import type { VariantConfig } from './config/options';
import { ERROR_CODES } from './constants/codes';
import { VARIANT_SEPARATOR } from './constants/defaults';
import { StorageError } from './errors';
import type { Logger } from './logger';
import type { StorageProvider } from './types';
import { assertKey } from './validation';

export type VariantName = 'thumb' | 'medium';

export interface VariantResult {
  readonly created: string[];
  /** Why nothing was created: the file is gone, or it is not an image that can be decoded. */
  readonly skipped?: 'MISSING' | 'UNREADABLE';
}

/** Port for image processing; `sharp` is the default adapter, swap it without touching callers. */
export interface ImageProcessor {
  /** Smaller WebP copy: EXIF-rotated, metadata stripped, never enlarged. Throws on unreadable input. */
  resize(input: Buffer, width: number, quality: number): Promise<Buffer>;
}

/** Loads `sharp` lazily on first use. */
export const createSharpProcessor = (): ImageProcessor => ({
  resize: async (input, width, quality) => {
    const { default: sharp } = await import('sharp');
    return sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  },
});

const widthOf = (config: VariantConfig, name: VariantName): number =>
  name === 'thumb' ? config.thumbWidth : config.mediumWidth;
const suffixOf = (config: VariantConfig, name: VariantName): string =>
  name === 'thumb' ? config.thumbSuffix : config.mediumSuffix;
const NAMES: readonly VariantName[] = ['thumb', 'medium'];

/** `salons/cover/1/x.jpg` + `thumb` → `salons/cover/1/x_thumb.webp` (beside the original). */
export const variantKey = (config: VariantConfig, key: string, name: VariantName): string => {
  assertKey(key);
  const dot = key.lastIndexOf('.');
  const base = dot > key.lastIndexOf('/') ? key.slice(0, dot) : key;
  return `${base}${VARIANT_SEPARATOR}${suffixOf(config, name)}.${config.extension}`;
};

/** Every variant key of an original (to delete them together with it). */
export const variantKeys = (config: VariantConfig, key: string): string[] =>
  NAMES.map((name) => variantKey(config, key, name));

export interface VariantsDeps {
  readonly provider: Pick<StorageProvider, 'read' | 'write'>;
  readonly config: VariantConfig;
  readonly processor: ImageProcessor;
  readonly logger: Logger;
}

/**
 * Creates the thumbnail and medium public copies of a confirmed image. An unreadable image (e.g.
 * HEIC without a decoder) is skipped with a warning so clients fall back to the original; storage
 * failures propagate. A failure after the first copy is a real error, not a skip.
 */
export const createVariantsFor =
  ({ provider, config, processor, logger }: VariantsDeps) =>
  async (key: string): Promise<VariantResult> => {
    assertKey(key);
    const original = await provider.read(key);
    if (original === null) return { created: [], skipped: 'MISSING' };
    const created: string[] = [];
    for (const name of NAMES) {
      let body: Buffer;
      try {
        body = await processor.resize(original, widthOf(config, name), config.quality);
      } catch (error) {
        if (created.length > 0)
          throw new StorageError(ERROR_CODES.VARIANT_FAILED, 'Image variant failed', {
            cause: error,
          });
        logger.warn('storage.variants.unreadable', { key });
        return { created, skipped: 'UNREADABLE' };
      }
      const target = variantKey(config, key, name);
      await provider.write({
        key: target,
        body,
        contentType: config.contentType,
        visibility: 'PUBLIC',
      });
      created.push(target);
    }
    return { created };
  };
