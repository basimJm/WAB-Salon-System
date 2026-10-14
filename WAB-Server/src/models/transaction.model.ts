import { Schema, model, type Types } from 'mongoose';
import { PAYMENT_CURRENCY, TRANSACTIONS_COLLECTION } from '../constants/payments';
import {
  PLATFORMS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type Platform,
  type TransactionStatus,
  type TransactionType,
} from '../constants/enums';

/** One payment attempt with its gateway codes — the admin's attempt log (BUSINESS_DOMAIN.md §3.5). */
export interface TransactionRaw {
  bookingDraftId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  customerId: Types.ObjectId;
  salonId: Types.ObjectId;
  type: TransactionType;
  /** Integer fils. */
  amount: number;
  currency: typeof PAYMENT_CURRENCY;
  /** `<draftId>:<attempt>`: unique, so a repeated request returns the same checkout. */
  idempotencyKey: string;
  /** 1 for the first try on a draft, then 2, 3... (extension: needed to build the key). */
  attempt: number;
  provider: string;
  /** The gateway's session id. */
  providerRef?: string;
  status: TransactionStatus;
  gatewayCode?: string;
  gatewayMessage?: string;
  raw?: Record<string, unknown>;
  gatewayFee?: number;
  /** Set once the whole payment was handed back (slot lost, abandoned checkout): it can never back a booking. */
  refundedAt?: Date;
  /** Set once the salon's ledger holds this payment's CHARGE (and fee). */
  chargedAt?: Date;
  platform: Platform;
  appVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<TransactionRaw>(
  {
    bookingDraftId: { type: Schema.Types.ObjectId, ref: 'BookingDraft' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    currency: { type: String, enum: [PAYMENT_CURRENCY], required: true, default: PAYMENT_CURRENCY },
    idempotencyKey: { type: String, required: true },
    attempt: { type: Number, required: true, min: 1, validate: Number.isInteger },
    provider: { type: String, required: true },
    providerRef: { type: String },
    status: { type: String, enum: TRANSACTION_STATUSES, required: true },
    gatewayCode: { type: String },
    gatewayMessage: { type: String },
    raw: { type: Schema.Types.Mixed },
    gatewayFee: { type: Number, min: 0, validate: Number.isInteger },
    refundedAt: { type: Date },
    chargedAt: { type: Date },
    platform: { type: String, enum: PLATFORMS, required: true },
    appVersion: { type: String, required: true },
  },
  { timestamps: true, collection: TRANSACTIONS_COLLECTION },
);
transactionSchema.index({ idempotencyKey: 1 }, { unique: true });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ bookingDraftId: 1, attempt: -1 });
transactionSchema.index({ providerRef: 1 }, { sparse: true });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ salonId: 1, createdAt: -1 });

export const TransactionModel = model<TransactionRaw>('Transaction', transactionSchema);
