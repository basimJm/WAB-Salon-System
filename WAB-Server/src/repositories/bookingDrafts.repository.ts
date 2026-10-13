import type { Model } from 'mongoose';
import { BookingDraftModel, type BookingDraftRaw } from '../models/bookingDraft.model';
import { isObjectIdString } from '../utils/database/ids';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class BookingDraftsRepository extends BaseRepository<BookingDraftRaw> {
  constructor(model: Model<BookingDraftRaw> = BookingDraftModel) {
    super(model);
  }

  /** A customer has at most one draft; this is it. */
  latestOf(customerId: string): Promise<Entity<BookingDraftRaw> | null> {
    return this.findOne({ customerId });
  }

  /** Deletes the draft; `false` when it was already gone. */
  async remove(id: string): Promise<boolean> {
    if (!isObjectIdString(id)) return false;
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
