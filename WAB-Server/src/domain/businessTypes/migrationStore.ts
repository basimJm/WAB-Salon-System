import type { mongo } from 'mongoose';
import {
  MIGRATED_BUSINESS_TYPE,
  type BusinessTypeMigrationTarget,
} from '../../constants/businessTypes';
import { BookingModel } from '../../models/booking.model';
import { CatalogServiceModel } from '../../models/catalogService.model';
import { RecommendedPlacementModel } from '../../models/recommendedPlacement.model';
import { SalonModel } from '../../models/salon.model';
import type { BusinessTypeFieldMove, BusinessTypeMigrationStore } from './migration';

/**
 * Driver-level collections: the old field is no longer in the schemas, so Mongoose would strip
 * it from filters and updates; the driver reads and removes it as stored.
 */
const COLLECTIONS: Record<BusinessTypeMigrationTarget, () => mongo.Collection> = {
  salons: () => SalonModel.collection,
  catalogServices: () => CatalogServiceModel.collection,
  recommendedPlacements: () => RecommendedPlacementModel.collection,
  bookings: () => BookingModel.collection,
};

const pending = (move: BusinessTypeFieldMove, value: string): Record<string, unknown> => ({
  businessType: { $exists: false },
  [move.from]: value,
});

export const createMongoBusinessTypeMigrationStore = (): BusinessTypeMigrationStore => ({
  countPending: (target, move, value) => COLLECTIONS[target]().countDocuments(pending(move, value)),
  async migrate(target, move, value) {
    const result = await COLLECTIONS[target]().updateMany(pending(move, value), {
      $set: { businessType: MIGRATED_BUSINESS_TYPE, [move.to]: value },
      $unset: { [move.from]: '' },
    });
    return result.modifiedCount;
  },
});
