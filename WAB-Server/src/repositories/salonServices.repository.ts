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

  /**
   * Switches every service of a salon off and clears the bride-only flag (an audience change makes
   * them belong to the wrong catalog). Returns how many services changed.
   */
  async deactivateAll(salonId: string): Promise<number> {
    if (!isObjectIdString(salonId)) return 0;
    const result = await this.model
      .updateMany({ salonId }, { $set: { active: false, brideOnly: false } })
      .exec();
    return result.modifiedCount;
  }

  /**
   * After an audience change (§5.19): switches off the salon's services whose catalog entry is
   * not in `keepCatalogIds`, and clears every `brideOnly` flag when brides are no longer allowed.
   */
  async deactivateUnfitting(
    salonId: string,
    keepCatalogIds: readonly string[],
    clearBrideOnly: boolean,
  ): Promise<number> {
    if (!isObjectIdString(salonId)) return 0;
    const result = await this.model
      .updateMany(
        { salonId, catalogServiceId: { $nin: [...keepCatalogIds] } },
        { $set: { active: false, brideOnly: false } },
      )
      .exec();
    if (clearBrideOnly) {
      await this.model.updateMany({ salonId }, { $set: { brideOnly: false } }).exec();
    }
    return result.modifiedCount;
  }
}
