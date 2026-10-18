import type { Model } from 'mongoose';
import type { ExportStatus } from '../constants/exports';
import { ExportModel, type ExportRaw } from '../models/export.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class ExportsRepository extends BaseRepository<ExportRaw> {
  constructor(model: Model<ExportRaw> = ExportModel) {
    super(model);
  }

  /** Moves an export out of `from` in one step; `null` when somebody else already did. */
  async move(
    id: string,
    from: ExportStatus | readonly ExportStatus[],
    set: Record<string, unknown>,
  ): Promise<Entity<ExportRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const froms = Array.isArray(from) ? from : [from];
    const updated = await this.model
      .findOneAndUpdate({ _id: id, status: { $in: froms } }, { $set: set }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<ExportRaw>(updated);
  }

  /** Exports that still need running: QUEUED, or RUNNING and untouched since `staleBefore`. */
  async unfinished(staleBefore: Date): Promise<Entity<ExportRaw>[]> {
    return this.findMany({
      $or: [{ status: 'QUEUED' }, { status: 'RUNNING', updatedAt: { $lt: staleBefore } }],
    });
  }
}
