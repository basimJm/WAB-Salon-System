import type { Model } from 'mongoose';
import { SalonModel, type SalonRaw } from '../models/salon.model';
import type { SalonState } from '../constants/salon';
import { toEntity, type Entity } from '../utils/database/plain';
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

  /**
   * Moves a salon between states only if it is currently in `from` (one atomic update, so two
   * admins cannot both review the same application). `null` = not found or not in that state.
   */
  async transition(
    id: string,
    from: SalonState | readonly SalonState[],
    set: Record<string, unknown>,
  ): Promise<Entity<SalonRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, state: { $in: typeof from === 'string' ? [from] : [...from] } },
        { $set: set },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<SalonRaw>(updated);
  }

  /** `$set` of the given fields and `$unset` of the others in one update (profile edits). */
  async patch(
    id: string,
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<SalonRaw> | null> {
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
    return updated === null ? null : toEntity<SalonRaw>(updated);
  }
}
