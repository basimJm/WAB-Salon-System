import { Schema, model } from 'mongoose';
import { AUDIENCES, BUSINESS_TYPES, type Audience, type BusinessType } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** A service from the admin-managed catalog that salons pick from (BUSINESS_DOMAIN.md §3.2). */
export interface CatalogServiceRaw {
  name: LocalizedName;
  description: LocalizedName;
  imageKey: string;
  businessType: BusinessType;
  audience: Audience;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const catalogServiceSchema = new Schema<CatalogServiceRaw>(
  {
    name: { type: localizedNameSchema, required: true },
    description: { type: localizedNameSchema, required: true },
    imageKey: { type: String, required: true },
    businessType: { type: String, enum: BUSINESS_TYPES, required: true },
    audience: { type: String, enum: AUDIENCES, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// The catalog of one business type and audience, in display order (§3.2).
catalogServiceSchema.index({ businessType: 1, audience: 1, active: 1, sortOrder: 1 });
// Basic search on names; Arabic has no built-in stemmer, so no language is assumed (real search: Atlas).
catalogServiceSchema.index({ 'name.ar': 'text', 'name.en': 'text' }, { default_language: 'none' });

export const CatalogServiceModel = model<CatalogServiceRaw>('CatalogService', catalogServiceSchema);
