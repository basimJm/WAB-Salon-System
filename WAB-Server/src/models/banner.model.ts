import { Schema, model } from 'mongoose';
import {
  BANNERS_COLLECTION,
  BANNER_ACTIONS,
  BANNER_AUDIENCES,
  type BannerAction,
  type BannerAudience,
} from '../constants/banners';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** A carousel banner; shown from `startAt` (inclusive) to `endAt` (exclusive). */
export interface BannerRaw {
  imageKey: LocalizedName;
  action: BannerAction;
  actionValue?: string;
  gender: BannerAudience;
  startAt: Date;
  endAt: Date;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<BannerRaw>(
  {
    imageKey: { type: localizedNameSchema, required: true },
    action: { type: String, enum: BANNER_ACTIONS, default: 'NONE' },
    actionValue: { type: String },
    gender: { type: String, enum: BANNER_AUDIENCES, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: BANNERS_COLLECTION },
);
// Active banners of an audience in display order.
bannerSchema.index({ active: 1, gender: 1, order: 1 });

export const BannerModel = model<BannerRaw>('Banner', bannerSchema);
