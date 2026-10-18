import { LocalFsStorage } from './adapters/localFs';
import { MemoryStorage } from './adapters/memory';
import { S3Storage } from './adapters/s3';
import { resolveConfig, type ResolvedConfig, type StorageOptions } from './config/options';
import { configError } from './errors';
import type { StorageProvider } from './types';
import {
  createSharpProcessor,
  createVariantsFor,
  variantKey,
  variantKeys,
  type VariantName,
  type VariantResult,
} from './variants';

/** The port plus image variants (thumb/medium WebP beside the original). */
export interface Storage extends StorageProvider {
  /** Creates the smaller public copies of an image already confirmed in storage. */
  createVariants(key: string): Promise<VariantResult>;
  /** Key of one variant of an original. */
  variantKey(key: string, name: VariantName): string;
  /** Every variant key of an original (delete them together with it). */
  variantKeys(key: string): string[];
}

const buildLocalFs = (config: ResolvedConfig): LocalFsStorage => {
  /* istanbul ignore next -- resolveConfig already guarantees it; kept for the type checker */
  if (!config.localFs) throw configError('localFs options are required', { fields: ['localFs'] });
  return new LocalFsStorage({ ...config, localFs: config.localFs });
};

const buildS3 = (config: ResolvedConfig): S3Storage => {
  /* istanbul ignore next -- resolveConfig already guarantees it; kept for the type checker */
  if (!config.s3) throw configError('s3 options are required', { fields: ['s3'] });
  return new S3Storage({ ...config, s3: config.s3 });
};

const buildProvider = (config: ResolvedConfig): StorageProvider => {
  switch (config.provider) {
    case 'memory':
      return new MemoryStorage(config);
    case 'local-fs':
      return buildLocalFs(config);
    case 's3':
      return buildS3(config);
  }
};

/** Adds variants on top of any adapter, so every vendor gets them the same way. */
export const withVariants = (
  provider: StorageProvider,
  config: ResolvedConfig,
  options: Pick<StorageOptions, 'imageProcessor'> = {},
): Storage => {
  const createVariants = createVariantsFor({
    provider,
    config: config.variants,
    processor: options.imageProcessor ?? createSharpProcessor(),
    logger: config.logger,
  });
  return {
    createUploadUrl: (request) => provider.createUploadUrl(request),
    confirmUpload: (request) => provider.confirmUpload(request),
    getPublicUrl: (key) => provider.getPublicUrl(key),
    getSignedUrl: (request) => provider.getSignedUrl(request),
    read: (key) => provider.read(key),
    write: (request) => provider.write(request),
    delete: (keys) => provider.delete(keys),
    createVariants,
    variantKey: (key, name) => variantKey(config.variants, key, name),
    variantKeys: (key) => variantKeys(config.variants, key),
  };
};

/** The factory: picks the adapter from `options.provider`. */
export const createStorage = (options: StorageOptions): Storage => {
  const config = resolveConfig(options);
  return withVariants(buildProvider(config), config, options);
};

/** Dev helper: the local-fs adapter itself, to mount `createLocalFsHandler` on a Node server. */
export const createLocalFsStorage = (options: StorageOptions): LocalFsStorage => {
  const config = resolveConfig(options);
  if (config.provider !== 'local-fs')
    throw configError('provider must be local-fs', { fields: ['provider'] });
  return buildLocalFs(config);
};
