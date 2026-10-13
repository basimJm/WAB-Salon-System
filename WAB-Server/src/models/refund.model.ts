import { Schema, model, type Types } from 'mongoose';
import { REFUND_SOURCES, type RefundSource } from '../constants/enums';
import { REFUND_STATUSES, type RefundStatus } from '../constants/providers';
import { REFUNDS_COLLECTION } from '../constants/refunds';

/** One refund of a payment, with its attempts at the gateway (BUSINESS_DOMAIN.md §3.5). */
export interface RefundRaw {
  /** Absent when no booking was ever created (slot lost after payment). */
  bookingId?: Types.ObjectId;
  transactionId: Types.ObjectId;
  salonId: Types.ObjectId;
  customerId: Types.ObjectId;
  /** Integer fils. */
  amount: number;
  source: RefundSource;
  reason?: string;
  status: RefundStatus;
  idempotencyKey: string;
  providerRef?: string;
  attempts: number;
  /**
   * Counts the gateway's explicit rejections. Attempts that ended without an answer (outage, timeout)
   * reuse the gateway idempotency key, so a refund that actually went through is never repeated;
   * after a rejection a new key is needed or the gateway would replay the rejection.
   */
  gatewayRound: number;
  lastError?: string;
  /** When the next automatic attempt may run (exponential backoff). */
  nextAttemptAt?: Date;
  completedAt?: Date;
  manual?: { by: Types.ObjectId; reference: string };
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<RefundRaw>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    source: { type: String, enum: REFUND_SOURCES, required: true },
    reason: { type: String },
    status: { type: String, enum: REFUND_STATUSES, required: true },
    idempotencyKey: { type: String, required: true },
    providerRef: { type: String },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    gatewayRound: { type: Number, required: true, default: 0, min: 0 },
    lastError: { type: String },
    nextAttemptAt: { type: Date },
    completedAt: { type: Date },
    manual: {
      type: new Schema(
        {
          by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
          reference: { type: String, required: true },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true, collection: REFUNDS_COLLECTION },
);
refundSchema.index({ idempotencyKey: 1 }, { unique: true });
refundSchema.index({ bookingId: 1 });
refundSchema.index({ transactionId: 1 });
refundSchema.index({ status: 1, nextAttemptAt: 1 });
refundSchema.index({ status: 1, createdAt: -1 });

export const RefundModel = model<RefundRaw>('Refund', refundSchema);
