import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { FLAG_ASSET_DIR, FLAG_CONTENT_TYPE, SEED_COUNTRIES } from '../constants/referenceData';
import type { StorageProvider } from '../providers/storage/types';

export interface FlagImagesDeps {
  readonly storage: Pick<StorageProvider, 'write'>;
  /** The flag file shipped with the server, or `undefined` when there is none. */
  readonly read: (file: string) => Buffer | undefined;
}

export interface FlagImagesReport {
  readonly uploaded: number;
  /** Flag keys without a shipped file (their `flagUrl` stays unresolved until an admin adds one). */
  readonly missing: readonly string[];
}

/** `WAB-Server/assets/flags/<file>` from `src/` and from `dist/` alike. */
export const readShippedFlag = (file: string): Buffer | undefined => {
  const path = resolve(__dirname, '..', '..', ...FLAG_ASSET_DIR, file);
  return existsSync(path) ? readFileSync(path) : undefined;
};

/**
 * Writes the shipped flag image of every seeded country to its `flagKey` through the storage
 * port (public), so `GET /locations/countries` never hands out a URL to a missing object
 * (SRV-172). Rewrites the same keys when run again.
 */
export const uploadFlagImages = async (
  countries: readonly { readonly flagKey: string }[],
  deps: FlagImagesDeps,
): Promise<FlagImagesReport> => {
  let uploaded = 0;
  const missing: string[] = [];
  for (const { flagKey } of countries) {
    const body = deps.read(basename(flagKey));
    if (body === undefined) {
      missing.push(flagKey);
      continue;
    }
    await deps.storage.write({
      key: flagKey,
      body,
      contentType: FLAG_CONTENT_TYPE,
      visibility: 'PUBLIC',
    });
    uploaded += 1;
  }
  return { uploaded, missing };
};

/** The seeded countries' flags from the shipped files (`npm run seed`, `seed:demo-images`). */
export const uploadSeedFlags = (
  storage: Pick<StorageProvider, 'write'>,
): Promise<FlagImagesReport> =>
  uploadFlagImages(SEED_COUNTRIES, { storage, read: readShippedFlag });
