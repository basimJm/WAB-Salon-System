import type { Model } from 'mongoose';
import type { Audience, BusinessType } from '../constants/enums';
import {
  RecommendedPlacementModel,
  type RecommendedPlacementRaw,
} from '../models/recommendedPlacement.model';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class PlacementsRepository extends BaseRepository<RecommendedPlacementRaw> {
  constructor(model: Model<RecommendedPlacementRaw> = RecommendedPlacementModel) {
    super(model);
  }

  /** Placements of one business type showing at `at` for these audiences, in display order. */
  activeAt(
    businessType: BusinessType,
    audiences: readonly Audience[],
    at: Date,
  ): Promise<Entity<RecommendedPlacementRaw>[]> {
    return this.findMany(
      { businessType, audience: { $in: audiences }, startAt: { $lte: at }, endAt: { $gt: at } },
      { order: 1, startAt: 1 },
    );
  }
}
