import type { Logger } from '../../utils/logger';
import type { StorageProvider } from './types';

export interface RealStorageDeps {
  readonly logger: Logger;
  readonly isProduction: boolean;
}

/**
 * The production storage adapter (S3 + CDN through the `__NPM_SCOPE__/storage` SDK, or any object
 * store). Implement `StorageProvider` here and read its settings from `src/config`; until then
 * `STORAGE_PROVIDER=real` fails at startup (see src/providers/README.md).
 */
export const createRealStorage = (_deps: RealStorageDeps): StorageProvider => {
  throw new Error(
    'storage adapter not integrated: implement createRealStorage in src/providers/storage/real.ts',
  );
};
