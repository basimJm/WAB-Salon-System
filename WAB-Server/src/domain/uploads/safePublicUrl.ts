import type { StorageProvider } from '../../providers/storage';
import type { Logger } from '../../utils/logger';

/** Builds the URL of a stored public file, or `null` when the key cannot be one (logged). */
export type SafePublicUrl = (
  key: string,
  context: Readonly<Record<string, string>>,
) => string | null;

/**
 * Admin-entered keys reach public lists; one bad key must cost its own row, never the whole list.
 * Only an invalid key (`RangeError`) is absorbed: an unreachable provider still fails the request.
 */
export const createSafePublicUrl =
  (storage: Pick<StorageProvider, 'getPublicUrl'>, logger?: Logger): SafePublicUrl =>
  (key, context) => {
    try {
      return storage.getPublicUrl(key);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      logger?.warn(context, 'stored file key is invalid; row shown without its image');
      return null;
    }
  };
