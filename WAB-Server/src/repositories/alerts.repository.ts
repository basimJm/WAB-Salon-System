import type { Model } from 'mongoose';
import { AlertModel, type AlertRaw } from '../models/alert.model';
import { isObjectIdString } from '../utils/database/ids';
import { isDuplicateKeyError } from '../utils/database/errors';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class AlertsRepository extends BaseRepository<AlertRaw> {
  constructor(model: Model<AlertRaw> = AlertModel) {
    super(model);
  }

  /** Stores the alert unless one with the same `dedupeKey` exists; `null` for a repeat. */
  async createOnce(data: Partial<AlertRaw>): Promise<Entity<AlertRaw> | null> {
    try {
      return await this.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  }

  /** NEW → ACKNOWLEDGED in one step; `null` when it is unknown or was acknowledged already. */
  async acknowledge(id: string, at: Date): Promise<Entity<AlertRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'NEW' },
        { $set: { status: 'ACKNOWLEDGED', acknowledgedAt: at } },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<AlertRaw>(updated);
  }

  /** Alerts not mailed yet, oldest first. */
  async unemailed(limit: number): Promise<Entity<AlertRaw>[]> {
    const page = await this.findPage(
      { emailedAt: { $exists: false } },
      { page: 1, pageSize: limit },
      { createdAt: 1 },
    );
    return page.items;
  }

  async markEmailed(ids: readonly string[], at: Date): Promise<void> {
    const valid = ids.filter((id) => isObjectIdString(id));
    if (valid.length === 0) return;
    await this.model.updateMany({ _id: { $in: valid } }, { $set: { emailedAt: at } }).exec();
  }
}
