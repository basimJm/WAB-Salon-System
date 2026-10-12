import { Schema, model } from 'mongoose';
import { COUNTRY_CODE_PATTERN, type LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** BUSINESS_DOMAIN.md §3.2. */
export interface CityRaw {
  name: LocalizedName;
  countryCode: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<CityRaw>(
  {
    name: { type: localizedNameSchema, required: true },
    countryCode: { type: String, required: true, match: COUNTRY_CODE_PATTERN },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// Cities of a country, active first by sort order.
citySchema.index({ countryCode: 1, active: 1, sortOrder: 1 });

export const CityModel = model<CityRaw>('City', citySchema);
