import type { Model } from 'mongoose';
import {
  SubscriptionModel,
  type SubscriptionPayment,
  type SubscriptionRaw,
} from '../models/subscription.model';
import type { SubscriptionStatus } from '../constants/subscriptions';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';

import { BaseRepository } from './base.repository';

export class SubscriptionsRepository extends BaseRepository<SubscriptionRaw> {
  constructor(model: Model<SubscriptionRaw> = SubscriptionModel) {
    super(model);
  }

  /**
   * Adds a payment, makes the subscription ACTIVE and extends the paid period to the later of the
   * current end and the payment's end (BUSINESS_DOMAIN.md §5.13), in one atomic update.
   */
  async addPayment(
    salonId: string,
    payment: SubscriptionPayment,
  ): Promise<Entity<SubscriptionRaw> | null> {
    if (!isObjectIdString(salonId)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { salonId },
        {
          $push: { payments: payment },
          $set: { status: 'ACTIVE' },
          $max: { currentPeriodEnd: payment.periodTo },
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<SubscriptionRaw>(updated);
  }

  /** TRIAL/ACTIVE → EXPIRED only while it is still in the status that was read (a payment may race). */
  async expire(id: string, from: SubscriptionStatus): Promise<Entity<SubscriptionRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate({ _id: id, status: from }, { $set: { status: 'EXPIRED' } }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<SubscriptionRaw>(updated);
  }

  /** Remembers that the "ending soon" alert was sent for this end date. */
  async markWarned(id: string, end: Date): Promise<void> {
    if (!isObjectIdString(id)) return;
    await this.model.findOneAndUpdate({ _id: id }, { $set: { warnedEnd: end } }).exec();
  }
}
