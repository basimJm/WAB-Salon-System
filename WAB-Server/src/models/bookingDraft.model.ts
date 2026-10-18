import { Schema, model, type Types } from 'mongoose';
import { BOOKING_DRAFTS_COLLECTION } from '../constants/bookingDrafts';
import { PAYMENT_OPTIONS } from '../constants/salon';
import { bookingPersonSchema, type BookingPersonRaw } from './bookingPerson';
import { policySchema, type SalonPolicy } from './salon.model';

/** A time held for the draft in Redis; kept here so the holds can be released again. */
export interface DraftHold {
  staffId: Types.ObjectId;
  /** Salon-local civil date of the hold. */
  date: string;
  start: Date;
  end: Date;
}

/** A priced, validated booking waiting for confirmation and payment; gone after `expiresAt`. */
export interface BookingDraftRaw {
  customerId: Types.ObjectId;
  salonId: Types.ObjectId;
  persons: BookingPersonRaw[];
  totals: { total: number; dueOnline: number };
  paymentMethod: (typeof PAYMENT_OPTIONS)[number];
  policySnapshot: SalonPolicy;
  otpVerifiedAt?: Date;
  transactionId?: Types.ObjectId;
  holds: DraftHold[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const holdSchema = new Schema<DraftHold>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    date: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false },
);

const draftSchema = new Schema<BookingDraftRaw>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    persons: { type: [bookingPersonSchema], required: true },
    totals: {
      type: new Schema(
        {
          total: { type: Number, required: true, min: 0 },
          dueOnline: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
      required: true,
    },
    paymentMethod: { type: String, enum: PAYMENT_OPTIONS, required: true },
    policySnapshot: { type: policySchema, required: true },
    otpVerifiedAt: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    holds: { type: [holdSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: BOOKING_DRAFTS_COLLECTION },
);
// Mongo removes expired drafts itself (checked about once a minute); reads still compare the date.
draftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
draftSchema.index({ customerId: 1, createdAt: -1 });

export const BookingDraftModel = model<BookingDraftRaw>('BookingDraft', draftSchema);
