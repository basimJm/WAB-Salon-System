import type { Model } from 'mongoose';
import { PayoutModel, type PayoutRaw } from '../models/payout.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class PayoutsRepository extends BaseRepository<PayoutRaw> {
  constructor(model: Model<PayoutRaw> = PayoutModel) {
    super(model);
  }

  /** The salon's most recent payout (any status): its period end is where the next one starts. */
  async latestFor(salonId: string): Promise<Entity<PayoutRaw> | null> {
    const page = await this.findPage({ salonId }, { page: 1, pageSize: 1 }, { periodTo: -1 });
    return page.items[0] ?? null;
  }

  /** PENDING → TRANSFERRED in one atomic step; `null` when it was not pending (anymore). */
  async markTransferred(
    id: string,
    set: { transferredAt: Date; transferReference: string; note: string },
  ): Promise<Entity<PayoutRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'PENDING' },
        { $set: { ...set, status: 'TRANSFERRED' } },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<PayoutRaw>(updated);
  }
}
