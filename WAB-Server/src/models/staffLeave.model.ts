import { Schema, model, type Types } from 'mongoose';
import { LEAVES_COLLECTION, LEAVE_NOTE_MAX_LENGTH } from '../constants/leaves';
import { LOCAL_DATE_PATTERN } from '../constants/time';

/**
 * A date range a staff member is away (BUSINESS_DOMAIN.md §3.4). Dates are zone-free civil dates
 * (`YYYY-MM-DD`, the salon's calendar); `to` is inclusive.
 */
export interface StaffLeaveRaw {
  memberId: Types.ObjectId;
  salonId: Types.ObjectId;
  /** Branch (§3.3a); set on every new row, backfilled by the branch migration. */
  branchId?: Types.ObjectId;
  from: string;
  to: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffLeaveSchema = new Schema<StaffLeaveRaw>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    from: { type: String, required: true, match: LOCAL_DATE_PATTERN },
    to: { type: String, required: true, match: LOCAL_DATE_PATTERN },
    note: { type: String, trim: true, maxlength: LEAVE_NOTE_MAX_LENGTH },
  },
  { timestamps: true, collection: LEAVES_COLLECTION },
);
staffLeaveSchema.index({ memberId: 1, to: 1 });
staffLeaveSchema.index({ salonId: 1, from: 1 });
staffLeaveSchema.index({ branchId: 1, from: 1 });

export const StaffLeaveModel = model<StaffLeaveRaw>('StaffLeave', staffLeaveSchema);
