import type { Model } from 'mongoose';
import { SalonModel, type SalonRaw } from '../models/salon.model';
import { isObjectIdString } from '../utils/database/ids';
import { BaseRepository } from './base.repository';

export class SalonsRepository extends BaseRepository<SalonRaw> {
  constructor(model: Model<SalonRaw> = SalonModel) {
    super(model);
  }

  /**
   * Removes a salon whose owner could not be created (registration compensation). Only for a salon
   * nobody has seen yet: salons are otherwise never deleted.
   */
  async discard(id: string): Promise<void> {
    if (isObjectIdString(id)) await this.model.deleteOne({ _id: id }).exec();
  }
}
