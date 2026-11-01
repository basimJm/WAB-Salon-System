import { DEMO_FILE_PREFIX } from '../../constants/demoSeed';
import { OBJECT_KEY_PATTERN } from '../../constants/providers';
import {
  STORAGE_CLEANUP_BATCH_SIZE,
  STORAGE_CLEANUP_MAX_ATTEMPTS,
  STORAGE_CLEANUP_RETRY_BASE_MS,
  STORAGE_CLEANUP_RETRY_MAX_MS,
  type StorageCleanupReason,
} from '../../constants/uploads';
import { objectKeyOf } from '../../providers/storage/fileRef';
import type { StorageProvider } from '../../providers/storage/types';
import type { StorageCleanupsRepository } from '../../repositories/storageCleanups.repository';
import type { UploadsRepository } from '../../repositories/uploads.repository';
import type { Logger } from '../../utils/logger';

export interface CleanupRun {
  /** Objects deleted from storage (missing ones count: deletion is idempotent). */
  readonly deleted: number;
  /** Rows dropped without deleting: the key is a live slot again. */
  readonly kept: number;
  /** Rows left for a later run after a provider failure. */
  readonly failed: number;
}

/**
 * Reliable deletion of stored objects (BUSINESS_DOMAIN §3.7 `storageCleanups`, SRV-181). MongoDB and
 * the object store share no transaction, so callers first stop referencing a file in the database,
 * then `enqueue` it; `drain` (periodic job, and right after an enqueue) deletes it from storage.
 */
export interface StorageCleanup {
  /** Queues objects for deletion. Demo files and malformed keys are never queued. */
  enqueue(refs: readonly (string | undefined)[], reason: StorageCleanupReason): Promise<void>;
  /** A slot got new content: a pending deletion of its key must not run. */
  cancel(ref: string): Promise<void>;
  drain(): Promise<CleanupRun>;
}

export interface StorageCleanupDeps {
  readonly cleanups: Pick<StorageCleanupsRepository, 'enqueue' | 'due' | 'retryLater' | 'remove'>;
  readonly uploads: Pick<UploadsRepository, 'isLiveSlot'>;
  readonly storage: Pick<StorageProvider, 'delete'>;
  readonly logger: Logger;
  readonly now?: () => Date;
  /** Try the deletion right after an enqueue (server: yes; tests drain explicitly). */
  readonly drainOnEnqueue?: boolean;
}

const DEMO_PREFIX = `${DEMO_FILE_PREFIX}/`;

/** Delay before retry n (1-based): base * 2^(n-1), capped. */
export const cleanupRetryDelayMs = (attempts: number): number =>
  Math.min(
    STORAGE_CLEANUP_RETRY_BASE_MS * 2 ** Math.max(attempts - 1, 0),
    STORAGE_CLEANUP_RETRY_MAX_MS,
  );

export const createStorageCleanup = (deps: StorageCleanupDeps): StorageCleanup => {
  const { cleanups, uploads, storage, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const drain = async (): Promise<CleanupRun> => {
    const rows = await cleanups.due(now(), STORAGE_CLEANUP_BATCH_SIZE);
    let kept = 0;
    const toDelete: typeof rows = [];
    for (const row of rows) {
      if (await uploads.isLiveSlot(row.key)) {
        await cleanups.remove(row.key);
        kept += 1;
      } else toDelete.push(row);
    }
    if (toDelete.length === 0) return { deleted: 0, kept, failed: 0 };
    try {
      await storage.delete(toDelete.map((row) => row.key));
    } catch (error) {
      const code = error instanceof Error ? error.name : 'Error';
      for (const row of toDelete) {
        const attempts = row.attempts + 1;
        await cleanups.retryLater(
          row.key,
          attempts,
          new Date(now().getTime() + cleanupRetryDelayMs(attempts)),
          code,
        );
        if (attempts >= STORAGE_CLEANUP_MAX_ATTEMPTS)
          logger.error({ key: row.key, attempts }, 'stored file still not deleted; retrying');
      }
      logger.warn({ err: error, count: toDelete.length }, 'storage cleanup failed; will retry');
      return { deleted: 0, kept, failed: toDelete.length };
    }
    for (const row of toDelete) await cleanups.remove(row.key);
    logger.info({ deleted: toDelete.length, kept }, 'storage cleanup ran');
    return { deleted: toDelete.length, kept, failed: 0 };
  };

  return {
    async enqueue(refs, reason) {
      const keys = [
        ...new Set(refs.filter((ref): ref is string => ref !== undefined).map(objectKeyOf)),
      ];
      const queued: string[] = [];
      for (const key of keys) {
        // Demo files are shared seed assets; a malformed key cannot be one of ours.
        if (key.startsWith(DEMO_PREFIX)) continue;
        if (!OBJECT_KEY_PATTERN.test(key)) {
          logger.warn({ reason }, 'stored file key is invalid; not queued for deletion');
          continue;
        }
        await cleanups.enqueue(key, reason, now());
        queued.push(key);
      }
      if (queued.length > 0 && deps.drainOnEnqueue === true) {
        void drain().catch((error: unknown) => {
          logger.warn({ err: error }, 'storage cleanup after enqueue failed; the job retries');
        });
      }
    },
    async cancel(ref) {
      await cleanups.remove(objectKeyOf(ref));
    },
    drain,
  };
};
