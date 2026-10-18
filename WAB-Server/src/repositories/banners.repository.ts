import type { Model } from 'mongoose';
import type { BannerAudience } from '../constants/banners';
import { BannerModel, type BannerRaw } from '../models/banner.model';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class BannersRepository extends BaseRepository<BannerRaw> {
  constructor(model: Model<BannerRaw> = BannerModel) {
    super(model);
  }

  /** Active banners for the audiences, whose window contains `now` (start inclusive, end exclusive). */
  findLive(audiences: readonly BannerAudience[], now: Date): Promise<Entity<BannerRaw>[]> {
    return this.findMany(
      {
        active: true,
        gender: { $in: [...audiences] },
        startAt: { $lte: now },
        endAt: { $gt: now },
      },
      { order: 1 },
    );
  }
}
