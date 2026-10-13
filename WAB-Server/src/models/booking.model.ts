import { Schema, model, type Types } from 'mongoose';
import { BOOKINGS_COLLECTION } from '../constants/bookings';
import {
  ACTOR_TYPES,
  BOOKING_PAYMENT_STATUSES,
  BOOKING_REFUND_STATUSES,
  BOOKING_STATUSES,
  GENDERS,
  type ActorType,
  type BookingPaymentStatus,
  type BookingRefundStatus,
  type BookingStatus,
  type Gender,
} from '../constants/enums';
import { PAYMENT_OPTIONS } from '../constants/salon';
import { bookingPersonSchema, type BookingPersonRaw } from './bookingPerson';
import { policySchema, type SalonPolicy } from './salon.model';

export interface StatusHistoryEntry {
  status: BookingStatus;
  actorType: ActorType;
  actorId?: Types.ObjectId;
  reason?: string;
  at: Date;
}

/** All amounts are integer fils. */
export interface BookingMoney {
  total: number;
  dueOnline: number;
  paidOnline: number;
  remaining: number;
  refunded: number;
}

/** A customer's appointment request at one salon, for one or more persons (BUSINESS_DOMAIN.md §3.5). */
export interface BookingRaw {
  referenceNumber: string;
  customerId: Types.ObjectId;
  salonId: Types.ObjectId;
  salonGender: Gender;
  persons: BookingPersonRaw[];
  /** Earliest person start / latest person end. */
  appointmentStart: Date;
  appointmentEnd: Date;
  hasBride: boolean;
  status: BookingStatus;
  statusHistory: StatusHistoryEntry[];
  paymentMethod: (typeof PAYMENT_OPTIONS)[number];
  money: BookingMoney;
  paymentStatus: BookingPaymentStatus;
  refundStatus: BookingRefundStatus;
  policySnapshot: SalonPolicy;
  /** A pending request is cancelled automatically when this passes. */
  respondBy: Date;
  completedAt?: Date;
  noShowAt?: Date;
  ratingPromptSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<StatusHistoryEntry>(
  {
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    actorType: { type: String, enum: ACTOR_TYPES, required: true },
    actorId: { type: Schema.Types.ObjectId },
    reason: { type: String },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const moneySchema = new Schema<BookingMoney>(
  {
    total: { type: Number, required: true, min: 0 },
    dueOnline: { type: Number, required: true, min: 0 },
    paidOnline: { type: Number, required: true, min: 0 },
    remaining: { type: Number, required: true },
    refunded: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bookingSchema = new Schema<BookingRaw>(
  {
    referenceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    salonGender: { type: String, enum: GENDERS, required: true },
    persons: { type: [bookingPersonSchema], required: true },
    appointmentStart: { type: Date, required: true },
    appointmentEnd: { type: Date, required: true },
    hasBride: { type: Boolean, required: true, default: false },
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    statusHistory: { type: [historySchema], required: true },
    paymentMethod: { type: String, enum: PAYMENT_OPTIONS, required: true },
    money: { type: moneySchema, required: true },
    paymentStatus: { type: String, enum: BOOKING_PAYMENT_STATUSES, required: true },
    refundStatus: { type: String, enum: BOOKING_REFUND_STATUSES, required: true, default: 'NONE' },
    policySnapshot: { type: policySchema, required: true },
    respondBy: { type: Date, required: true },
    completedAt: { type: Date },
    noShowAt: { type: Date },
    ratingPromptSent: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: BOOKINGS_COLLECTION },
);
bookingSchema.index({ referenceNumber: 1 }, { unique: true });
bookingSchema.index({ customerId: 1, appointmentStart: -1 });
bookingSchema.index({ salonId: 1, appointmentStart: 1 });
bookingSchema.index({ salonId: 1, status: 1 });
// Overlap checks: "does this staff member have a live booking in this window?"
bookingSchema.index({ 'persons.staffId': 1, 'persons.start': 1, status: 1 });
bookingSchema.index({ status: 1, respondBy: 1 });

export const BookingModel = model<BookingRaw>('Booking', bookingSchema);
