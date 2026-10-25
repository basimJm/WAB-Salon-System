import { Schema, model, type Types } from 'mongoose';
import {
  BRANCHES_COLLECTION,
  BRANCH_LOCATION_TEXT_MAX_LENGTH,
  BRANCH_NAME_MAX_LENGTH,
  BRANCH_NAME_MIN_LENGTH,
  BRANCH_OFFLINE_ACTOR_TYPES,
  BRANCH_OFFLINE_REASON_MAX_LENGTH,
  BRANCH_STATUSES,
  type BranchOfflineActorType,
  type BranchStatus,
} from '../constants/branches';
import { E164_PATTERN } from '../constants/providers';
import type { LocalizedName } from '../constants/referenceData';
import { DAYS_OF_WEEK } from '../constants/time';
import { defaultSchedule, scheduleDaySchema, type ScheduleDay } from './salon.model';

/**
 * One place where a salon works (BUSINESS_DOMAIN.md §3.3a): its own address, contacts, hours,
 * closures, services and staff. Name, media, policy, subscription and rating stay on the salon.
 */
export interface BranchRaw {
  salonId: Types.ObjectId;
  name: LocalizedName;
  /** Exactly one per salon. */
  isMain: boolean;
  status: BranchStatus;
  location?: { type: 'Point'; coordinates: [number, number] };
  locationText?: string;
  cityId?: Types.ObjectId;
  areaId?: Types.ObjectId;
  phone?: string;
  whatsapp?: string;
  weeklySchedule: ScheduleDay[];
  offline?: { reason: string; at: Date; actorType: BranchOfflineActorType; by: Types.ObjectId };
  completeness: { missing: string[]; isComplete: boolean };
  closedAt?: Date;
  closedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const nameText = {
  type: String,
  required: true,
  trim: true,
  minlength: BRANCH_NAME_MIN_LENGTH,
  maxlength: BRANCH_NAME_MAX_LENGTH,
};

const branchSchema = new Schema<BranchRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    name: { type: new Schema({ ar: nameText, en: nameText }, { _id: false }), required: true },
    isMain: { type: Boolean, default: false },
    status: { type: String, enum: BRANCH_STATUSES, required: true, default: 'ACTIVE' },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    locationText: { type: String, trim: true, maxlength: BRANCH_LOCATION_TEXT_MAX_LENGTH },
    cityId: { type: Schema.Types.ObjectId, ref: 'City' },
    areaId: { type: Schema.Types.ObjectId, ref: 'Area' },
    phone: { type: String, match: E164_PATTERN },
    whatsapp: { type: String, match: E164_PATTERN },
    weeklySchedule: {
      type: [scheduleDaySchema],
      default: defaultSchedule,
      validate: (value: ScheduleDay[]) => value.length === DAYS_OF_WEEK.length,
    },
    offline: {
      type: new Schema(
        {
          reason: { type: String, required: true, maxlength: BRANCH_OFFLINE_REASON_MAX_LENGTH },
          at: { type: Date, required: true },
          actorType: { type: String, enum: BRANCH_OFFLINE_ACTOR_TYPES, required: true },
          by: { type: Schema.Types.ObjectId, required: true },
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
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true, collection: BRANCHES_COLLECTION },
);
// Nearest list and distance on cards; a salon's branches; city/area filters; one main per salon.
branchSchema.index({ location: '2dsphere' });
branchSchema.index({ salonId: 1, status: 1 });
branchSchema.index({ cityId: 1, areaId: 1 });
branchSchema.index({ salonId: 1 }, { unique: true, partialFilterExpression: { isMain: true } });

export const BranchModel = model<BranchRaw>('Branch', branchSchema);
