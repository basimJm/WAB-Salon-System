import { Schema, model, type Types } from 'mongoose';
import {
  SALON_SERVICES_COLLECTION,
  SERVICE_DURATION_MAX,
  SERVICE_DURATION_MIN,
  SERVICE_DURATION_STEP_MIN,
  SERVICE_EXTRA_DESCRIPTION_MAX_LENGTH,
} from '../constants/salonServices';

/** A catalog service a salon offers, with its own price and duration (BUSINESS_DOMAIN.md §3.3). */
export interface SalonServiceRaw {
  salonId: Types.ObjectId;
  /** Branch (§3.3a); set on every new row, backfilled by the branch migration. */
  branchId?: Types.ObjectId;
  catalogServiceId: Types.ObjectId;
  /** Integer fils, > 0. */
  price: number;
  durationMinutes: number;
  /** Only allowed in women's salons. */
  brideOnly: boolean;
  extraDescription?: string;
  mediaKeys: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const salonServiceSchema = new Schema<SalonServiceRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    catalogServiceId: { type: Schema.Types.ObjectId, ref: 'CatalogService', required: true },
    price: { type: Number, required: true, min: 1, validate: Number.isInteger },
    durationMinutes: {
      type: Number,
      required: true,
      min: SERVICE_DURATION_MIN,
      max: SERVICE_DURATION_MAX,
      validate: (value: number) =>
        Number.isInteger(value) && value % SERVICE_DURATION_STEP_MIN === 0,
    },
    brideOnly: { type: Boolean, default: false },
    extraDescription: { type: String, maxlength: SERVICE_EXTRA_DESCRIPTION_MAX_LENGTH },
    mediaKeys: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: SALON_SERVICES_COLLECTION },
);
salonServiceSchema.index({ salonId: 1, catalogServiceId: 1 }, { unique: true });
salonServiceSchema.index({ catalogServiceId: 1, active: 1 });
salonServiceSchema.index({ branchId: 1, active: 1 });
// One row per catalog service per branch; rows not migrated yet (no branch) are left out.
salonServiceSchema.index(
  { branchId: 1, catalogServiceId: 1 },
  { unique: true, partialFilterExpression: { branchId: { $exists: true } } },
);

export const SalonServiceModel = model<SalonServiceRaw>('SalonService', salonServiceSchema);
