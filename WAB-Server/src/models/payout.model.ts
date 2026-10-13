import { Schema, model, type Types } from 'mongoose';
import { PAYOUT_STATUSES, type PayoutStatus } from '../constants/enums';
import {
  PAYOUT_NOTE_MAX_LENGTH,
  PAYOUT_REFERENCE_MAX_LENGTH,
  PAYOUTS_COLLECTION,
} from '../constants/payouts';

/**
 * What WAB owes a salon for a period and whether it was transferred (BUSINESS_DOMAIN.md §3.5).
 * All amounts are integer fils and positive: `net = gross − fees − refunds + adjustments`.
 */
export interface PayoutRaw {
  salonId: Types.ObjectId;
  /** Exclusive start: the end of the salon's previous payout (the epoch for the first one). */
  periodFrom: Date;
  /** Inclusive end of the entries counted. */
  periodTo: Date;
  gross: number;
  fees: number;
  refunds: number;
  /** Signed: manual corrections in the period (extension of the domain record). */
  adjustments: number;
  net: number;
  status: PayoutStatus;
  transferredAt?: Date;
  transferReference?: string;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const money = { type: Number, required: true, validate: Number.isInteger };

const payoutSchema = new Schema<PayoutRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    gross: { ...money, min: 0 },
    fees: { ...money, min: 0 },
    refunds: { ...money, min: 0 },
    adjustments: money,
    net: { ...money, min: 1 },
    status: { type: String, enum: PAYOUT_STATUSES, required: true },
    transferredAt: { type: Date },
    transferReference: { type: String, maxlength: PAYOUT_REFERENCE_MAX_LENGTH },
    note: { type: String, maxlength: PAYOUT_NOTE_MAX_LENGTH },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true, collection: PAYOUTS_COLLECTION },
);
payoutSchema.index({ salonId: 1, periodTo: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });
// One open payout per salon: the next one starts only after this one was transferred.
payoutSchema.index(
  { salonId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } },
);

export const PayoutModel = model<PayoutRaw>('Payout', payoutSchema);
