import { Schema, type Types } from 'mongoose';
import { STAFF_SELECTIONS, type StaffSelection } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';
import { GENDERS, type Gender } from '../constants/enums';

/** A service as it was when the booking was made: later price or name changes do not touch it. */
export interface BookingServiceSnapshot {
  salonServiceId: Types.ObjectId;
  catalogServiceId: Types.ObjectId;
  name: LocalizedName;
  /** Integer fils. */
  price: number;
  durationMinutes: number;
}

/** One person of a booking (BUSINESS_DOMAIN.md §3.5): the account holder or a companion. */
export interface BookingPersonRaw {
  name: string;
  isMain: boolean;
  isBride: boolean;
  /**
   * The person's gender (§5.19): sent for BOTH salons and clinics (mixed bookings); for a
   * single-gender salon it is that salon's audience. Missing on bookings before business types.
   */
  gender?: Gender;
  services: BookingServiceSnapshot[];
  staffId: Types.ObjectId;
  staffSelection: StaffSelection;
  start: Date;
  /** `start` + the sum of the service durations. */
  end: Date;
  /** Integer fils: the sum of the service prices. */
  subtotal: number;
  /**
   * Optional tattoo design image (§5.23, TATTOO bookings only): a confirmed private
   * `BOOKING_REFERENCE` upload on drafts, the person's file slot (`key?v=n`) once booked.
   */
  referenceImageKey?: string;
}

const serviceSnapshotSchema = new Schema<BookingServiceSnapshot>(
  {
    salonServiceId: { type: Schema.Types.ObjectId, ref: 'SalonService', required: true },
    catalogServiceId: { type: Schema.Types.ObjectId, ref: 'CatalogService', required: true },
    name: { type: localizedNameSchema, required: true },
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    durationMinutes: { type: Number, required: true, min: 1, validate: Number.isInteger },
  },
  { _id: false },
);

export const bookingPersonSchema = new Schema<BookingPersonRaw>(
  {
    name: { type: String, required: true, trim: true },
    isMain: { type: Boolean, required: true },
    isBride: { type: Boolean, required: true, default: false },
    gender: { type: String, enum: GENDERS },
    services: { type: [serviceSnapshotSchema], required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    staffSelection: { type: String, enum: STAFF_SELECTIONS, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    subtotal: { type: Number, required: true, min: 0, validate: Number.isInteger },
    referenceImageKey: { type: String },
  },
  { _id: false },
);
