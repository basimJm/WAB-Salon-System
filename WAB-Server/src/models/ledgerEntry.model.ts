import { Schema, model, type Types } from 'mongoose';
import { LEDGER_TYPES, type LedgerType } from '../constants/enums';
import { LEDGER_COLLECTION, LEDGER_NOTE_MAX_LENGTH } from '../constants/ledger';
import { makeAppendOnly } from './appendOnly';

/**
 * One movement of a salon's balance (BUSINESS_DOMAIN.md §3.5). Amounts are signed integer fils:
 * CHARGE is positive; GATEWAY_FEE, REFUND and PAYOUT are negative. Append-only: a mistake is
 * corrected with an ADJUSTMENT, never by editing an entry.
 */
export interface LedgerEntryRaw {
  salonId: Types.ObjectId;
  type: LedgerType;
  amount: number;
  bookingId?: Types.ObjectId;
  transactionId?: Types.ObjectId;
  refundId?: Types.ObjectId;
  payoutId?: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const ledgerSchema = new Schema<LedgerEntryRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'amount must be an integer number of fils',
      },
    },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    refundId: { type: Schema.Types.ObjectId, ref: 'Refund' },
    payoutId: { type: Schema.Types.ObjectId, ref: 'Payout' },
    note: { type: String, maxlength: LEDGER_NOTE_MAX_LENGTH },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: LEDGER_COLLECTION },
);
ledgerSchema.index({ salonId: 1, createdAt: -1 });
// A payment is charged once and its fee booked once; a refund is booked once.
ledgerSchema.index(
  { transactionId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ['CHARGE', 'GATEWAY_FEE'] },
      transactionId: { $exists: true },
    },
  },
);
ledgerSchema.index(
  { refundId: 1 },
  { unique: true, partialFilterExpression: { type: 'REFUND', refundId: { $exists: true } } },
);
makeAppendOnly(ledgerSchema);

export const LedgerEntryModel = model<LedgerEntryRaw>('LedgerEntry', ledgerSchema);
