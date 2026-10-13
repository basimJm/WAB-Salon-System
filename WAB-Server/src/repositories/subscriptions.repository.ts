import type { Model } from 'mongoose';
import { SubscriptionModel, type SubscriptionRaw } from '../models/subscription.model';
import { BaseRepository } from './base.repository';

export class SubscriptionsRepository extends BaseRepository<SubscriptionRaw> {
  constructor(model: Model<SubscriptionRaw> = SubscriptionModel) {
    super(model);
  }
}
