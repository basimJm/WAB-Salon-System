import { Schema, model, type Types } from 'mongoose';
import {
  DEFAULT_CLOSE,
  DEFAULT_OPEN,
  DEPOSIT_PERCENT_MAX,
  DEPOSIT_PERCENT_MIN,
  FULL_PAYMENT_REFUND_RULES,
  NO_SHOW_DEPOSIT_RULES,
  NO_SHOW_FULL_PAYMENT_RULES,
  PAYMENT_OPTIONS,
  SALONS_COLLECTION,
  SALON_DESCRIPTION_MAX_LENGTH,
  SALON_NAME_MAX_LENGTH,
  SALON_NAME_MIN_LENGTH,
  SALON_NOTES_MAX_LENGTH,
  SALON_REJECTION_REASON_MAX_LENGTH,
  SALON_STATES,
  SCHEDULE_DAY_ORDER,
  type SalonState,
} from '../constants/salon';
import { GENDERS, type Gender } from '../constants/enums';
import { E164_PATTERN } from '../constants/providers';
import { DAYS_OF_WEEK, HH_MM_PATTERN, type DayOfWeek } from '../constants/time';

export interface ScheduleDay {
  day: DayOfWeek;
  isOff: boolean;
  open: string;
  close: string;
}

export interface SalonPolicy {
  cancellationWindowHours: number;
  paymentOptions: (typeof PAYMENT_OPTIONS)[number][];
  depositPercentage?: number;
  depositRefundableOnCustomerCancel: boolean;
  fullPaymentRefundOnCustomerCancel: (typeof FULL_PAYMENT_REFUND_RULES)[number];
  noShowDeposit: (typeof NO_SHOW_DEPOSIT_RULES)[number];
  noShowFullPayment: (typeof NO_SHOW_FULL_PAYMENT_RULES)[number];
  notes?: string;
}

export interface SalonApplication {
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  resubmissionCount: number;
  /** Private license documents (1-5 storage keys, admin-only signed URLs). */
  documentKeys: string[];
}

/** A salon (BUSINESS_DOMAIN.md §3.3). Later tasks fill location, hours, policy, payout details. */
export interface PayoutDetails {
  bankName: string;
  accountHolderName: string;
  ibanEncrypted: string;
  ibanLast4: string;
}

export interface SalonRaw {
  name: string;
  gender: Gender;
  state: SalonState;
  description?: string;
  coverKey?: string;
  profileKey?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  locationText?: string;
  cityId?: Types.ObjectId;
  areaId?: Types.ObjectId;
  phone?: string;
  whatsapp?: string;
  weeklySchedule: ScheduleDay[];
  policy?: SalonPolicy;
  application: SalonApplication;
  offline?: { reason: string; at: Date; by: Types.ObjectId };
  completeness: { missing: string[]; isComplete: boolean };
  rating: { avg: number; count: number };
  /** The IBAN is stored encrypted (AES-GCM); only its last four characters are readable. */
  payoutDetails?: PayoutDetails;
  deletionRequestedAt?: Date;
  searchText: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleDaySchema = new Schema<ScheduleDay>(
  {
    day: { type: String, enum: DAYS_OF_WEEK, required: true },
    isOff: { type: Boolean, default: true },
    open: { type: String, match: HH_MM_PATTERN, default: DEFAULT_OPEN },
    close: { type: String, match: HH_MM_PATTERN, default: DEFAULT_CLOSE },
  },
  { _id: false },
);

export const policySchema = new Schema<SalonPolicy>(
  {
    cancellationWindowHours: { type: Number, required: true, min: 0 },
    paymentOptions: {
      type: [{ type: String, enum: PAYMENT_OPTIONS }],
      validate: (value: unknown[]) => value.length >= 1,
    },
    depositPercentage: { type: Number, min: DEPOSIT_PERCENT_MIN, max: DEPOSIT_PERCENT_MAX },
    depositRefundableOnCustomerCancel: { type: Boolean, required: true },
    fullPaymentRefundOnCustomerCancel: {
      type: String,
      enum: FULL_PAYMENT_REFUND_RULES,
      required: true,
    },
    noShowDeposit: { type: String, enum: NO_SHOW_DEPOSIT_RULES, required: true },
    noShowFullPayment: { type: String, enum: NO_SHOW_FULL_PAYMENT_RULES, required: true },
    notes: { type: String, maxlength: SALON_NOTES_MAX_LENGTH },
  },
  { _id: false },
);

const applicationSchema = new Schema<SalonApplication>(
  {
    submittedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    rejectionReason: { type: String, maxlength: SALON_REJECTION_REASON_MAX_LENGTH },
    resubmissionCount: { type: Number, default: 0, min: 0 },
    documentKeys: { type: [String], default: [] },
  },
  { _id: false },
);

const defaultSchedule = (): ScheduleDay[] =>
  SCHEDULE_DAY_ORDER.map((day) => ({
    day,
    isOff: true,
    open: DEFAULT_OPEN,
    close: DEFAULT_CLOSE,
  }));

const salonSchema = new Schema<SalonRaw>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: SALON_NAME_MIN_LENGTH,
      maxlength: SALON_NAME_MAX_LENGTH,
    },
    gender: { type: String, enum: GENDERS, required: true },
    state: { type: String, enum: SALON_STATES, required: true },
    description: { type: String, maxlength: SALON_DESCRIPTION_MAX_LENGTH },
    coverKey: { type: String },
    profileKey: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: { type: [Number] },
    },
    locationText: { type: String },
    cityId: { type: Schema.Types.ObjectId, ref: 'City' },
    areaId: { type: Schema.Types.ObjectId, ref: 'Area' },
    phone: { type: String, match: E164_PATTERN },
    whatsapp: { type: String, match: E164_PATTERN },
    weeklySchedule: {
      type: [scheduleDaySchema],
      default: defaultSchedule,
      validate: (value: ScheduleDay[]) => value.length === DAYS_OF_WEEK.length,
    },
    policy: { type: policySchema },
    application: { type: applicationSchema, required: true },
    offline: {
      type: new Schema(
        {
          reason: { type: String, required: true },
          at: { type: Date, required: true },
          by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
        },
        { _id: false },
      ),
    },
    completeness: {
      type: new Schema(
        { missing: { type: [String], default: [] }, isComplete: { type: Boolean, default: false } },
        { _id: false },
      ),
      default: () => ({ missing: [], isComplete: false }),
    },
    payoutDetails: {
      type: new Schema(
        {
          bankName: { type: String, required: true },
          accountHolderName: { type: String, required: true },
          ibanEncrypted: { type: String, required: true },
          ibanLast4: { type: String, required: true },
        },
        { _id: false },
      ),
    },
    rating: {
      type: new Schema(
        { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
        { _id: false },
      ),
      default: () => ({ avg: 0, count: 0 }),
    },
    deletionRequestedAt: { type: Date },
    searchText: { type: String, default: '' },
  },
  { timestamps: true, collection: SALONS_COLLECTION },
);
salonSchema.index({ location: '2dsphere' });
salonSchema.index({ state: 1, gender: 1 });
salonSchema.index({ cityId: 1, areaId: 1 });

export const SalonModel = model<SalonRaw>('Salon', salonSchema);
