import type { Model } from 'mongoose';
import { FavoriteModel, type FavoriteRaw } from '../models/favorite.model';
import { isObjectIdString } from '../utils/database/ids';
import { BaseRepository } from './base.repository';

export class FavoritesRepository extends BaseRepository<FavoriteRaw> {
  constructor(model: Model<FavoriteRaw> = FavoriteModel) {
    super(model);
  }

  /** Removes the pair; `false` when it was not saved. */
  async remove(customerId: string, salonId: string): Promise<boolean> {
    if (!isObjectIdString(customerId) || !isObjectIdString(salonId)) return false;
    const result = await this.model.deleteOne({ customerId, salonId }).exec();
    return result.deletedCount > 0;
  }

  /** Which of these salons the customer saved. */
  async among(customerId: string, salonIds: readonly string[]): Promise<Set<string>> {
    if (salonIds.length === 0) return new Set();
    const rows = await this.findMany({ customerId, salonId: { $in: [...salonIds] } });
    return new Set(rows.map((r) => r.salonId));
  }
}
