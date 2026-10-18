import type { Model } from 'mongoose';
import { ReviewModel, type ReviewRaw } from '../models/review.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import type { ReviewStatus } from '../constants/enums';
import { BaseRepository } from './base.repository';

export class ReviewsRepository extends BaseRepository<ReviewRaw> {
  constructor(model: Model<ReviewRaw> = ReviewModel) {
    super(model);
  }

  /**
   * Moves a review between statuses only if it is currently in `from` (one atomic update, so two
   * admins cannot both decide it). `null` = not found or not in that status.
   */
  async transition(
    id: string,
    from: ReviewStatus,
    set: Record<string, unknown>,
  ): Promise<Entity<ReviewRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate({ _id: id, status: from }, { $set: set }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<ReviewRaw>(updated);
  }

  /** Sum and number of the ratings of the APPROVED reviews matching `filter`. */
  async approvedTotals(filter: Record<string, unknown>): Promise<{ sum: number; count: number }> {
    const [row] = await this.model
      .aggregate<{ sum: number; count: number }>([
        { $match: { ...filter, status: 'APPROVED' } },
        { $group: { _id: null, sum: { $sum: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();
    return { sum: row?.sum ?? 0, count: row?.count ?? 0 };
  }
}
