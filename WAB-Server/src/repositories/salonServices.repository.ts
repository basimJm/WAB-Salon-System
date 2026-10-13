import type { Model } from 'mongoose';
import { SalonServiceModel, type SalonServiceRaw } from '../models/salonService.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class SalonServicesRepository extends BaseRepository<SalonServiceRaw> {
  constructor(model: Model<SalonServiceRaw> = SalonServiceModel) {
    super(model);
  }

  /** Active services of a salon (counts towards the profile being complete). */
  countActive(salonId: string): Promise<number> {
    return this.count({ salonId, active: true });
  }

  /** `$set` and `$unset` in one update (a service's optional description can be cleared). */
  async patch(
    id: string,
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<SalonServiceRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const unset = change.unset ?? [];
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          $set: change.set,
          ...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }),
        },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<SalonServiceRaw>(updated);
  }
}
