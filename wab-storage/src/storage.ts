import { LocalFsStorage } from './adapters/localFs';
import { S3Storage } from './adapters/s3';
import { MemoryStorage } from './adapters/memory';
import { resolveConfig, type ResolvedConfig, type StorageOptions } from './config/options';
import { configError } from './errors';
import type { StorageProvider } from './types';

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

/** The factory: picks the adapter from `options.provider`. */
export const createStorage = (options: StorageOptions): StorageProvider => {
  const config = resolveConfig(options);
  switch (config.provider) {
    case 'memory':
      return new MemoryStorage(config);
    case 'local-fs':
      return buildLocalFs(config);
    case 's3':
      return buildS3(config);
  }
};

/** Dev helper: the local-fs adapter itself, to mount `createLocalFsHandler` on a Node server. */
export const createLocalFsStorage = (options: StorageOptions): LocalFsStorage => {
  const config = resolveConfig(options);
  if (config.provider !== 'local-fs')
    throw configError('provider must be local-fs', { fields: ['provider'] });
  return buildLocalFs(config);
};
