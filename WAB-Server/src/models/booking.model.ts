import { Schema, model, type Types } from 'mongoose';
import { BOOKINGS_COLLECTION } from '../constants/bookings';
import {
  ACTOR_TYPES,
  BOOKING_PAYMENT_STATUSES,
  BOOKING_REFUND_STATUSES,
  BOOKING_STATUSES,
  AUDIENCES,
  BUSINESS_TYPES,
  GENDERS,
  type Gender,
  type ActorType,
  type BookingPaymentStatus,
  type BookingRefundStatus,
  type BookingStatus,
  type Audience,
  type BusinessType,
} from '../constants/enums';
import { PAYMENT_OPTIONS } from '../constants/salon';
import type { LocalizedName } from '../constants/referenceData';
import { bookingPersonSchema, type BookingPersonRaw } from './bookingPerson';
import { localizedNameSchema } from './localizedName';
import { policySchema, type SalonPolicy } from './salon.model';

export interface StatusHistoryEntry {
  status: BookingStatus;
  actorType: ActorType;
  actorId?: Types.ObjectId;
  reason?: string;
  at: Date;
}

/** Why a salon rejected or cancelled (BUSINESS_DOMAIN.md §3.5 `rejection` / `cancellation`). */
export interface BookingDecision {
  by?: ActorType;
  actorId?: Types.ObjectId;
  reasonCode: string;
  reasonText?: string;
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
/** Branch facts copied into the booking at creation (name, address, phone). */
export interface BranchSnapshot {
  name: LocalizedName;
  locationText?: string;
  phone?: string;
}

/** Who made the booking (§5.20). */
export const BOOKING_SOURCES = ['CUSTOMER_APP', 'MERCHANT'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** The customer as the member entered them (MERCHANT bookings, §5.20). */
export interface CustomerContact {
  name: string;
  phone: { dialCode: string; number: string; e164: string };
  gender: Gender;
}

/** Close reminders of a finished booking (§5.21). */
export interface CloseReminders {
  count: number;
  lastAt?: Date;
  overdueAlertedAt?: Date;
}

export interface BookingRaw {
  referenceNumber: string;
  /**
   * The customer account. Always set for CUSTOMER_APP; for MERCHANT set when the phone belongs to
   * a registered customer, or later when that number registers (claim, §5.20).
   */
  customerId?: Types.ObjectId;
  /** Default CUSTOMER_APP (bookings before §5.20 have none). */
  source?: BookingSource;
  /** The member who made a MERCHANT booking (name as it was). */
  createdBy?: { memberId: Types.ObjectId; name: string };
  /** MERCHANT bookings: the customer as entered (also kept when the customer is registered). */
  customerContact?: CustomerContact;
  closeReminders?: CloseReminders;
  salonId: Types.ObjectId;
  /** Branch of the appointment (§3.5); set on every new booking, backfilled by the migration. */
  branchId?: Types.ObjectId;
  /** The branch as the customer saw it when booking. */
  branchSnapshot?: BranchSnapshot;
  /** Snapshots of the business at booking time (§3.5, §5.19). */
  businessType: BusinessType;
  salonAudience: Audience;
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
  rejection?: BookingDecision;
  cancellation?: BookingDecision;
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

const decisionSchema = new Schema<BookingDecision>(
  {
    by: { type: String, enum: ACTOR_TYPES },
    actorId: { type: Schema.Types.ObjectId },
    reasonCode: { type: String, required: true },
    reasonText: { type: String },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<BookingRaw>(
  {
    referenceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    source: { type: String, enum: BOOKING_SOURCES },
    createdBy: {
      type: new Schema(
        {
          memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
          name: { type: String, required: true },
        },
        { _id: false },
      ),
    },
    customerContact: {
      type: new Schema<CustomerContact>(
        {
          name: { type: String, required: true, trim: true },
          phone: {
            type: new Schema(
              {
                dialCode: { type: String, required: true },
                number: { type: String, required: true },
                e164: { type: String, required: true },
              },
              { _id: false },
            ),
            required: true,
          },
          gender: { type: String, enum: GENDERS, required: true },
        },
        { _id: false },
      ),
    },
    closeReminders: {
      type: new Schema<CloseReminders>(
        {
          count: { type: Number, required: true, default: 0 },
          lastAt: { type: Date },
          overdueAlertedAt: { type: Date },
        },
        { _id: false },
      ),
    },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    branchSnapshot: {
      type: new Schema<BranchSnapshot>(
        {
          name: { type: localizedNameSchema, required: true },
          locationText: { type: String },
          phone: { type: String },
        },
        { _id: false },
      ),
    },
    businessType: { type: String, enum: BUSINESS_TYPES, required: true },
    salonAudience: { type: String, enum: AUDIENCES, required: true },
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
    rejection: { type: decisionSchema },
    cancellation: { type: decisionSchema },
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
bookingSchema.index({ branchId: 1, appointmentStart: 1 });
bookingSchema.index({ branchId: 1, status: 1 });
// Overlap checks: "does this staff member have a live booking in this window?"
bookingSchema.index({ 'persons.staffId': 1, 'persons.start': 1, status: 1 });
bookingSchema.index({ status: 1, respondBy: 1 });
// To close (§5.21) and the claim of business-made bookings by phone (§5.20).
bookingSchema.index({ status: 1, appointmentEnd: 1 });
bookingSchema.index(
  { 'customerContact.phone.e164': 1 },
  { partialFilterExpression: { 'customerContact.phone.e164': { $exists: true } } },
);

export const BookingModel = model<BookingRaw>('Booking', bookingSchema);
