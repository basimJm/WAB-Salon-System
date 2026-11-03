import type { Model } from 'mongoose';
import type { StorageCleanupReason } from '../constants/uploads';
import { StorageCleanupModel, type StorageCleanupRaw } from '../models/storageCleanup.model';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

/** The `storageCleanups` outbox (SRV-181): one row per object key to delete. */
export class StorageCleanupsRepository extends BaseRepository<StorageCleanupRaw> {
  constructor(model: Model<StorageCleanupRaw> = StorageCleanupModel) {
    super(model);
  }

  /** Queues a key (again): due now, attempts restart. Idempotent per key. */
  async enqueue(key: string, reason: StorageCleanupReason, at: Date): Promise<void> {
    await this.model
      .findOneAndUpdate(
        { key },
        { $set: { reason, attempts: 0, nextAttemptAt: at } },
        { upsert: true, new: true },
      )
      .exec();
  }

  /** Rows due at `at`, oldest first. */
  async due(at: Date, limit: number): Promise<Entity<StorageCleanupRaw>[]> {
    const rows = await this.model
      .find({ nextAttemptAt: { $lte: at } })
      .sort({ nextAttemptAt: 1, _id: 1 })
      .limit(limit)
      .lean()
      .exec();
    return rows.map((row) => toEntity<StorageCleanupRaw>(row));
  }

  async retryLater(key: string, attempts: number, at: Date, lastError: string): Promise<void> {
    await this.model
      .findOneAndUpdate({ key }, { $set: { attempts, nextAttemptAt: at, lastError } })
      .exec();
  }

  /** Done (deleted, or no longer to delete). */
  async remove(key: string): Promise<void> {
    await this.model.deleteOne({ key }).exec();
  }
}
