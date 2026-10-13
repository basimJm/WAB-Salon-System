import type { Model } from 'mongoose';
import { SalonClosureModel, type SalonClosureRaw } from '../models/salonClosure.model';
import { isObjectIdString } from '../utils/database/ids';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class ClosuresRepository extends BaseRepository<SalonClosureRaw> {
  constructor(model: Model<SalonClosureRaw> = SalonClosureModel) {
    super(model);
  }

  /** All closures of a salon, soonest first. */
  forSalon(salonId: string): Promise<Entity<SalonClosureRaw>[]> {
    return this.findMany({ salonId }, { from: 1 });
  }

  /** Closures that have not ended before `date`. */
  upcoming(salonId: string, date: string): Promise<Entity<SalonClosureRaw>[]> {
    return this.findMany({ salonId, to: { $gte: date } }, { from: 1 });
  }

  async remove(salonId: string, id: string): Promise<boolean> {
    if (!isObjectIdString(id) || !isObjectIdString(salonId)) return false;
    const result = await this.model.deleteOne({ _id: id, salonId }).exec();
    return result.deletedCount > 0;
  }
}
