import type { Model } from 'mongoose';
import type { CampaignStatus } from '../constants/campaigns';
import {
  PushCampaignModel,
  type CampaignStats,
  type PushCampaignRaw,
} from '../models/pushCampaign.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class CampaignsRepository extends BaseRepository<PushCampaignRaw> {
  constructor(model: Model<PushCampaignRaw> = PushCampaignModel) {
    super(model);
  }

  /**
   * Takes the campaign for sending: a SCHEDULED one starts, a SENDING one (the previous run
   * crashed) resumes. `null` when it was cancelled, is already SENT, or does not exist.
   */
  async claim(id: string): Promise<Entity<PushCampaignRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const claimed = await this.model
      .findOneAndUpdate(
        { _id: id, status: { $in: ['SCHEDULED', 'SENDING'] } },
        { $set: { status: 'SENDING' } },
        { new: true },
      )
      .lean()
      .exec();
    return claimed === null ? null : toEntity<PushCampaignRaw>(claimed);
  }

  async finish(id: string, stats: CampaignStats, at: Date): Promise<void> {
    if (!isObjectIdString(id)) return;
    await this.model
      .findOneAndUpdate({ _id: id }, { $set: { status: 'SENT', sentAt: at, stats } })
      .exec();
  }

  /** Cancels a campaign that has not started; `null` when it already started or ended. */
  async cancel(id: string, at: Date): Promise<Entity<PushCampaignRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const cancelled = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'SCHEDULED' },
        { $set: { status: 'CANCELLED', cancelledAt: at } },
        { new: true },
      )
      .lean()
      .exec();
    return cancelled === null ? null : toEntity<PushCampaignRaw>(cancelled);
  }

  pending(statuses: readonly CampaignStatus[]): Promise<Entity<PushCampaignRaw>[]> {
    return this.findMany({ status: { $in: [...statuses] } }, { scheduledAt: 1 });
  }
}
