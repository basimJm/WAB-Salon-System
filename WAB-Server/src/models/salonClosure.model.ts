import { Schema, model, type Types } from 'mongoose';
import { CLOSURES_COLLECTION, CLOSURE_REASON_MAX_LENGTH } from '../constants/hours';
import { LOCAL_DATE_PATTERN } from '../constants/time';

/**
 * A date range the salon is closed (BUSINESS_DOMAIN.md §3.3). Dates are zone-free civil dates
 * (`YYYY-MM-DD`, the salon's local calendar); `to` is inclusive.
 */
export interface SalonClosureRaw {
  salonId: Types.ObjectId;
  /** Branch (§3.3a); set on every new row, backfilled by the branch migration. */
  branchId?: Types.ObjectId;
  from: string;
  to: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const closureSchema = new Schema<SalonClosureRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    from: { type: String, required: true, match: LOCAL_DATE_PATTERN },
    to: { type: String, required: true, match: LOCAL_DATE_PATTERN },
    reason: { type: String, required: true, trim: true, maxlength: CLOSURE_REASON_MAX_LENGTH },
  },
  { timestamps: true, collection: CLOSURES_COLLECTION },
);
closureSchema.index({ salonId: 1, to: 1 });
closureSchema.index({ branchId: 1, to: 1 });

export const SalonClosureModel = model<SalonClosureRaw>('SalonClosure', closureSchema);
