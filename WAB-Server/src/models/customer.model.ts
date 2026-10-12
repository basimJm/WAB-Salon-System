import { Schema, model, type Types } from 'mongoose';
import {
  CUSTOMERS_COLLECTION,
  EMAIL_MAX_LENGTH,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  PHONE_NUMBER_PATTERN,
} from '../constants/identity';
import {
  CUSTOMER_STATUSES,
  GENDERS,
  LANGUAGES,
  type CustomerStatus,
  type Gender,
  type Language,
} from '../constants/enums';
import { EMAIL_PATTERN, E164_PATTERN } from '../constants/providers';
import { COUNTRY_CODE_PATTERN, DIAL_CODE_PATTERN } from '../constants/referenceData';

export interface CustomerPhone {
  countryCode: string;
  dialCode: string;
  /** National number, digits only. */
  number: string;
  e164: string;
}

/** BUSINESS_DOMAIN.md §3.1. */
export interface CustomerRaw {
  firstName: string;
  lastName: string;
  email: string;
  gender: Gender;
  phone: CustomerPhone;
  cityId: Types.ObjectId;
  areaId: Types.ObjectId;
  avatarKey?: string;
  language: Language;
  pushEnabled: boolean;
  status: CustomerStatus;
  blockedReason?: string;
  blockedAt?: Date;
  deletionRequestedAt?: Date;
  deletionScheduledAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const name = {
  type: String,
  required: true,
  trim: true,
  minlength: PERSON_NAME_MIN_LENGTH,
  maxlength: PERSON_NAME_MAX_LENGTH,
};

const phoneSchema = new Schema<CustomerPhone>(
  {
    countryCode: { type: String, required: true, match: COUNTRY_CODE_PATTERN },
    dialCode: { type: String, required: true, match: DIAL_CODE_PATTERN },
    number: { type: String, required: true, match: PHONE_NUMBER_PATTERN },
    e164: {
      type: String,
      required: true,
      match: E164_PATTERN,
      // The full number must be the dial code followed by the national number.
      validate: {
        validator(this: unknown, value: string): boolean {
          const { dialCode, number } = this as Partial<CustomerPhone>;
          return value === `${dialCode ?? ''}${number ?? ''}`;
        },
      },
    },
  },
  { _id: false },
);

const customerSchema = new Schema<CustomerRaw>(
  {
    firstName: name,
    lastName: name,
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: EMAIL_MAX_LENGTH,
      match: EMAIL_PATTERN,
    },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: phoneSchema, required: true },
    cityId: { type: Schema.Types.ObjectId, required: true },
    areaId: { type: Schema.Types.ObjectId, required: true },
    avatarKey: { type: String },
    language: { type: String, enum: LANGUAGES, default: 'ar' },
    pushEnabled: { type: Boolean, default: true },
    status: { type: String, enum: CUSTOMER_STATUSES, default: 'ACTIVE' },
    blockedReason: { type: String },
    blockedAt: { type: Date },
    deletionRequestedAt: { type: Date },
    deletionScheduledAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: true, collection: CUSTOMERS_COLLECTION },
);
// One customer per phone; list filters; admin search by name or phone (no stemming: Arabic).
customerSchema.index({ 'phone.e164': 1 }, { unique: true });
customerSchema.index({ status: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index(
  { firstName: 'text', lastName: 'text', 'phone.e164': 'text' },
  { default_language: 'none' },
);

export const CustomerModel = model<CustomerRaw>('Customer', customerSchema);
