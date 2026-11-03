import {
  configureBucketCors,
  isStorageError,
  type BucketCorsRequest,
  type StorageOptions,
} from '@wab/storage';
import { loadConfig, type AppConfig } from '../../config';
import { STORAGE_CORS_MAX_AGE_SEC } from '../../constants/providers';
import { createLogger, type Logger } from '../../utils/logger';
import { toStorageOptions } from './real';

export interface StorageCorsDeps {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  readonly loadConfig?: () => AppConfig;
  readonly apply?: (options: StorageOptions, request: BucketCorsRequest) => Promise<void>;
  readonly logger?: Logger;
}

/**
 * `npm run storage:cors` (SRV-180): sets the browser CORS rule (presigned PUT + GET from the admin
 * panel origins in `CORS_ALLOWED_ORIGINS`) on the public and the private bucket of the configured
 * store (R2 or S3). Run once per environment by the operator; it prints counts, never keys or URLs.
 * Exit code 0 = applied, 1 = not applied.
 */
export const runStorageCors = async (deps: StorageCorsDeps): Promise<number> => {
  let config: AppConfig;
  try {
    config = (deps.loadConfig ?? loadConfig)();
  } catch {
    deps.err('storage:cors: the environment is invalid (run npm run env:check)\n');
    return 1;
  }
  if (config.storage === undefined) {
    deps.err('storage:cors: STORAGE_PROVIDER must be cloudflare-r2 or real, with its keys\n');
    return 1;
  }
  if (config.corsAllowedOrigins.length === 0) {
    deps.err('storage:cors: CORS_ALLOWED_ORIGINS is empty (name the admin panel origins)\n');
    return 1;
  }
  const logger = deps.logger ?? createLogger({ level: config.logLevel });
  try {
    await (deps.apply ?? configureBucketCors)(
      toStorageOptions({ settings: config.storage, isProduction: config.isProduction, logger }),
      { allowedOrigins: config.corsAllowedOrigins, maxAgeSec: STORAGE_CORS_MAX_AGE_SEC },
    );
  } catch (error) {
    const code = isStorageError(error) ? error.code : 'UNKNOWN';
    deps.err(`storage:cors: not applied (${code})\n`);
    return 1;
  }
  deps.out(
    `storage:cors: rule set on both buckets for ${String(config.corsAllowedOrigins.length)} origin(s)\n`,
  );
  return 0;
};
