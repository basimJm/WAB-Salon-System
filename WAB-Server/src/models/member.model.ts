import { Schema, model, type Types } from 'mongoose';
import { MEMBER_ROLES, PERMISSIONS, type MemberRole, type Permission } from '../constants/enums';
import {
  MEMBERS_COLLECTION,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  RATING_MAX,
  STAFF_BIO_MAX_LENGTH,
  STAFF_MAX_YEARS_OF_EXPERIENCE,
} from '../constants/identity';
import { E164_PATTERN } from '../constants/providers';
import { DAYS_OF_WEEK, HH_MM_PATTERN, type DayOfWeek } from '../constants/time';

export interface WorkingDay {
  day: DayOfWeek;
  /** Local `HH:mm`; both or neither (a day without hours follows the salon's hours). */
  start?: string;
  end?: string;
}

export interface StaffProfile {
  bio?: string;
  yearsOfExperience?: number;
  serviceIds: Types.ObjectId[];
  brideQualified: boolean;
  workingDays: WorkingDay[];
  rating: { avg: number; count: number };
  /** Distinct customers with COMPLETED bookings served. */
  customersCount: number;
}

/** A salon team member and, when `providesServices`, a staff profile (BUSINESS_DOMAIN.md §3.4). */
export interface MemberRaw {
  salonId: Types.ObjectId;
  /** The one branch of a MANAGER/EMPLOYEE (§3.4); absent for the OWNER, who covers every branch. */
  branchId?: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  photoKey?: string;
  role: MemberRole;
  /** Ignored for the OWNER, who has all permissions. */
  permissions: Permission[];
  active: boolean;
  providesServices: boolean;
  staff?: StaffProfile;
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

/** Marks a field required when its partner field is present: hours come as a pair. */
const needs = (partner: keyof WorkingDay) =>
  function required(this: unknown): boolean {
    return (this as Partial<WorkingDay>)[partner] !== undefined;
  };

const workingDaySchema = new Schema<WorkingDay>(
  {
    day: { type: String, enum: DAYS_OF_WEEK, required: true },
    start: { type: String, match: HH_MM_PATTERN, required: needs('end') },
    end: { type: String, match: HH_MM_PATTERN, required: needs('start') },
  },
  { _id: false },
);
// The day ends after it starts (zero-padded text sorts like time).
workingDaySchema.path('end').validate(function validateOrder(this: unknown): boolean {
  const { start, end } = this as Partial<WorkingDay>;
  return start === undefined || end === undefined || start < end;
}, 'working hours must be a start before an end');

const staffSchema = new Schema<StaffProfile>(
  {
    bio: { type: String, maxlength: STAFF_BIO_MAX_LENGTH },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: STAFF_MAX_YEARS_OF_EXPERIENCE,
      validate: Number.isInteger,
    },
    serviceIds: { type: [Schema.Types.ObjectId], default: [] },
    brideQualified: { type: Boolean, default: false },
    workingDays: { type: [workingDaySchema], default: [] },
    rating: {
      type: new Schema(
        {
          avg: { type: Number, default: 0, min: 0, max: RATING_MAX },
          count: { type: Number, default: 0, min: 0, validate: Number.isInteger },
        },
        { _id: false },
      ),
      default: () => ({ avg: 0, count: 0 }),
    },
    customersCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const memberSchema = new Schema<MemberRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    firstName: name,
    lastName: name,
    phone: { type: String, required: true, match: E164_PATTERN },
    photoKey: { type: String },
    role: { type: String, enum: MEMBER_ROLES, required: true },
    permissions: { type: [{ type: String, enum: PERMISSIONS }], default: [] },
    active: { type: Boolean, default: true },
    providesServices: { type: Boolean, default: false },
    staff: {
      type: staffSchema,
      // A member who provides services needs a staff profile.
      required(this: unknown): boolean {
        return (this as Partial<MemberRaw>).providesServices === true;
      },
    },
  },
  { timestamps: true, collection: MEMBERS_COLLECTION },
);
memberSchema.index({ phone: 1 }, { unique: true });
memberSchema.index({ salonId: 1, active: 1 });
memberSchema.index({ salonId: 1, providesServices: 1, 'staff.serviceIds': 1 });
// Exactly one OWNER per salon, enforced by the database.
memberSchema.index({ salonId: 1 }, { unique: true, partialFilterExpression: { role: 'OWNER' } });
memberSchema.index({ branchId: 1, active: 1 });

export const MemberModel = model<MemberRaw>('Member', memberSchema);
