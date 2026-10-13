import type { Model } from 'mongoose';
import { ReviewModel, type ReviewRaw } from '../models/review.model';
import { BaseRepository } from './base.repository';

export class ReviewsRepository extends BaseRepository<ReviewRaw> {
  constructor(model: Model<ReviewRaw> = ReviewModel) {
    super(model);
  }
}
