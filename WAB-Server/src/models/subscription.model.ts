import { Schema, model, type Types } from 'mongoose';
import {
  SUBSCRIPTIONS_COLLECTION,
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '../constants/subscriptions';

export interface SubscriptionPayment {
  amount: number;
  paidAt: Date;
  periodFrom: Date;
  periodTo: Date;
  method: string;
  reference: string;
  note?: string;
  recordedBy: Types.ObjectId;
}

/** One subscription per salon (BUSINESS_DOMAIN.md §3.5); money is integer fils. */
export interface SubscriptionRaw {
  salonId: Types.ObjectId;
  status: SubscriptionStatus;
  trialEndsAt: Date;
  currentPeriodEnd?: Date;
  payments: SubscriptionPayment[];
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<SubscriptionPayment>(
  {
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger },
    paidAt: { type: Date, required: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    method: { type: String, required: true },
    reference: { type: String, required: true },
    note: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { _id: false },
);

const subscriptionSchema = new Schema<SubscriptionRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true },
    trialEndsAt: { type: Date, required: true },
    currentPeriodEnd: { type: Date },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true, collection: SUBSCRIPTIONS_COLLECTION },
);
subscriptionSchema.index({ salonId: 1 }, { unique: true });
// The daily expiry job scans by status and end dates.
subscriptionSchema.index({ status: 1, trialEndsAt: 1 });

export const SubscriptionModel = model<SubscriptionRaw>('Subscription', subscriptionSchema);
