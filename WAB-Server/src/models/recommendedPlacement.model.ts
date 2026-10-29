import { Schema, model, type Types } from 'mongoose';
import { AUDIENCES, BUSINESS_TYPES, type Audience, type BusinessType } from '../constants/enums';
import { PLACEMENTS_COLLECTION, PLACEMENT_NOTE_MAX_LENGTH } from '../constants/placements';

/**
 * A paid slot in the customers' "Recommended" section. Active while `startAt <= now < endAt`;
 * nothing has to run to hide an expired one.
 */
export interface RecommendedPlacementRaw {
  salonId: Types.ObjectId;
  /** Copied from the salon (§3.7). */
  businessType: BusinessType;
  audience: Audience;
  startAt: Date;
  endAt: Date;
  order: number;
  /** Integer fils. */
  amountPaid: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const placementSchema = new Schema<RecommendedPlacementRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    businessType: { type: String, enum: BUSINESS_TYPES, required: true },
    audience: { type: String, enum: AUDIENCES, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    order: { type: Number, required: true, min: 0, default: 0 },
    amountPaid: { type: Number, required: true, min: 0, validate: Number.isInteger },
    note: { type: String, trim: true, maxlength: PLACEMENT_NOTE_MAX_LENGTH },
  },
  { timestamps: true, collection: PLACEMENTS_COLLECTION },
);
placementSchema.index({ businessType: 1, audience: 1, startAt: 1, endAt: 1 });
placementSchema.index({ salonId: 1, endAt: 1 });

export const RecommendedPlacementModel = model<RecommendedPlacementRaw>(
  'RecommendedPlacement',
  placementSchema,
);
