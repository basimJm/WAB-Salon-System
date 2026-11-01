import type { Model } from 'mongoose';
import type { UploadOwnerType, UploadPurpose, UploadStatus } from '../constants/uploads';
import { UploadModel, type UploadRaw } from '../models/upload.model';
import { toObjectId } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export interface SlotRecordInput {
  readonly key: string;
  readonly purpose: UploadPurpose;
  readonly ownerType: UploadOwnerType;
  readonly ownerId: string;
  readonly salonId?: string;
  readonly contentType: string;
  readonly size: number;
  readonly at: Date;
}

export class UploadsRepository extends BaseRepository<UploadRaw> {
  constructor(model: Model<UploadRaw> = UploadModel) {
    super(model);
  }

  findByKey(key: string): Promise<Entity<UploadRaw> | null> {
    return this.findOne({ key });
  }

  findByKeys(keys: readonly string[]): Promise<Entity<UploadRaw>[]> {
    return this.findMany({ key: { $in: [...keys] } });
  }

  /**
   * Writes the one row of a file slot (SRV-181) and bumps its version atomically: the file id and
   * key stay, metadata follows the new content. Returns the row with the new version.
   */
  async saveSlot(input: SlotRecordInput): Promise<Entity<UploadRaw>> {
    const saved = await this.model
      .findOneAndUpdate(
        { key: input.key },
        {
          $set: {
            purpose: input.purpose,
            ownerType: input.ownerType,
            ownerId: input.ownerId,
            ...(input.salonId === undefined ? {} : { salonId: toObjectId(input.salonId) }),
            contentType: input.contentType,
            maxBytes: Math.max(input.size, 1),
            size: input.size,
            status: 'CONFIRMED',
            slot: true,
            expiresAt: input.at,
          },
          $inc: { version: 1 },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return toEntity<UploadRaw>(saved);
  }

  /** Is this key a slot whose object is in use (a cleanup must then leave it alone)? */
  async isLiveSlot(key: string): Promise<boolean> {
    return (await this.findOne({ key, slot: true, status: 'CONFIRMED' })) !== null;
  }

  async deleteByKey(key: string): Promise<void> {
    await this.model.deleteOne({ key }).exec();
  }

  /** Atomic status change: only an upload that is still `from` moves (two confirms cannot both win). */
  async transition(
    key: string,
    from: UploadStatus,
    to: UploadStatus,
  ): Promise<Entity<UploadRaw> | null> {
    const updated = await this.model
      .findOneAndUpdate({ key, status: from }, { $set: { status: to } }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<UploadRaw>(updated);
  }
}
