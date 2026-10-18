import type { Model } from 'mongoose';
import type { Gender } from '../constants/enums';
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

  /** Placements showing at `at` for an audience, in display order. */
  activeAt(gender: Gender, at: Date): Promise<Entity<RecommendedPlacementRaw>[]> {
    return this.findMany(
      { gender, startAt: { $lte: at }, endAt: { $gt: at } },
      { order: 1, startAt: 1 },
    );
  }
}
