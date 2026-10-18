import { Schema, model, type Types } from 'mongoose';
import { FAVORITES_COLLECTION } from '../constants/favorites';

/** A salon a customer saved. One row per pair. */
export interface FavoriteRaw {
  customerId: Types.ObjectId;
  salonId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<FavoriteRaw>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  },
  { timestamps: true, collection: FAVORITES_COLLECTION },
);
favoriteSchema.index({ customerId: 1, salonId: 1 }, { unique: true });
favoriteSchema.index({ customerId: 1, createdAt: -1 });

export const FavoriteModel = model<FavoriteRaw>('Favorite', favoriteSchema);
