import type { Model } from 'mongoose';
import { CatalogRequestModel, type CatalogRequestRaw } from '../models/catalogRequest.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class CatalogRequestsRepository extends BaseRepository<CatalogRequestRaw> {
  constructor(model: Model<CatalogRequestRaw> = CatalogRequestModel) {
    super(model);
  }

  /** Decides a request only while it is still PENDING (two admins cannot both decide). */
  async decide(
    id: string,
    set: Record<string, unknown>,
  ): Promise<Entity<CatalogRequestRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate({ _id: id, status: 'PENDING' }, { $set: set }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<CatalogRequestRaw>(updated);
  }
}
