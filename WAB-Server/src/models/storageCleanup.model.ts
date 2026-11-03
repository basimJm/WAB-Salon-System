import { model, Schema } from 'mongoose';
import {
  STORAGE_CLEANUP_REASONS,
  STORAGE_CLEANUPS_COLLECTION,
  type StorageCleanupReason,
} from '../constants/uploads';

/**
 * Outbox of stored objects to delete (BUSINESS_DOMAIN §3.7 `storageCleanups`, SRV-181). A row is
 * written only after the database stopped referencing the object; the periodic job deletes it.
 */
export interface StorageCleanupRaw {
  key: string;
  reason: StorageCleanupReason;
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storageCleanupSchema = new Schema<StorageCleanupRaw>(
  {
    key: { type: String, required: true },
    reason: { type: String, enum: STORAGE_CLEANUP_REASONS, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, required: true },
    lastError: { type: String },
  },
  { timestamps: true, collection: STORAGE_CLEANUPS_COLLECTION },
);
storageCleanupSchema.index({ key: 1 }, { unique: true });
storageCleanupSchema.index({ nextAttemptAt: 1 });

export const StorageCleanupModel = model<StorageCleanupRaw>('StorageCleanup', storageCleanupSchema);
