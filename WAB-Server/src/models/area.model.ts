import { Schema, model, type Types } from 'mongoose';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** BUSINESS_DOMAIN.md §3.2. */
export interface AreaRaw {
  cityId: Types.ObjectId;
  name: LocalizedName;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const areaSchema = new Schema<AreaRaw>(
  {
    cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
    name: { type: localizedNameSchema, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// Areas of a city, active first by sort order.
areaSchema.index({ cityId: 1, active: 1, sortOrder: 1 });

export const AreaModel = model<AreaRaw>('Area', areaSchema);
