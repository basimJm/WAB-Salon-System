import { Schema, type Types } from 'mongoose';
import { STAFF_SELECTIONS, type StaffSelection } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

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
  services: BookingServiceSnapshot[];
  staffId: Types.ObjectId;
  staffSelection: StaffSelection;
  start: Date;
  /** `start` + the sum of the service durations. */
  end: Date;
  /** Integer fils: the sum of the service prices. */
  subtotal: number;
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
    services: { type: [serviceSnapshotSchema], required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    staffSelection: { type: String, enum: STAFF_SELECTIONS, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    subtotal: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);
