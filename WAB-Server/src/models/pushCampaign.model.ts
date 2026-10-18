import { Schema, model, type Types } from 'mongoose';
import { APP_KINDS, GENDERS, type AppKind, type Gender } from '../constants/enums';
import {
  CAMPAIGN_AUDIENCE_KINDS,
  CAMPAIGN_LINK_MAX_LENGTH,
  CAMPAIGN_STATUSES,
  CAMPAIGNS_COLLECTION,
  type CampaignAudienceKind,
  type CampaignStatus,
} from '../constants/campaigns';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from '../constants/notifications';
import type { NotificationText } from './notification.model';

export interface CampaignAudience {
  kind: CampaignAudienceKind;
  gender?: Gender;
  cityIds?: Types.ObjectId[];
  salonId?: Types.ObjectId;
  customerIds?: Types.ObjectId[];
}

export interface CampaignStats {
  targeted: number;
  sent: number;
  /** FCM reports no delivery receipts yet, so this follows `sent`. */
  delivered: number;
  opened: number;
  failed: number;
}

/** BUSINESS_DOMAIN.md §3.6 `pushCampaigns`; `status` and `cancelledAt` are additions (cancel / resume). */
export interface PushCampaignRaw {
  title: NotificationText;
  body: NotificationText;
  app: AppKind;
  audience: CampaignAudience;
  link?: string;
  scheduledAt: Date;
  sentAt?: Date;
  status: CampaignStatus;
  cancelledAt?: Date;
  stats: CampaignStats;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const text = (max: number): Schema<NotificationText> =>
  new Schema<NotificationText>(
    {
      ar: { type: String, required: true, trim: true, maxlength: max },
      en: { type: String, required: true, trim: true, maxlength: max },
    },
    { _id: false },
  );

const audienceSchema = new Schema<CampaignAudience>(
  {
    kind: { type: String, enum: CAMPAIGN_AUDIENCE_KINDS, required: true },
    gender: { type: String, enum: GENDERS },
    cityIds: { type: [Schema.Types.ObjectId], default: undefined },
    salonId: { type: Schema.Types.ObjectId },
    customerIds: { type: [Schema.Types.ObjectId], default: undefined },
  },
  { _id: false },
);

const count = { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger };
const statsSchema = new Schema<CampaignStats>(
  { targeted: count, sent: count, delivered: count, opened: count, failed: count },
  { _id: false },
);

const campaignSchema = new Schema<PushCampaignRaw>(
  {
    title: { type: text(NOTIFICATION_TITLE_MAX_LENGTH), required: true },
    body: { type: text(NOTIFICATION_BODY_MAX_LENGTH), required: true },
    app: { type: String, enum: APP_KINDS, required: true },
    audience: { type: audienceSchema, required: true },
    link: { type: String, trim: true, maxlength: CAMPAIGN_LINK_MAX_LENGTH },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date },
    status: { type: String, enum: CAMPAIGN_STATUSES, required: true, default: 'SCHEDULED' },
    cancelledAt: { type: Date },
    stats: { type: statsSchema, required: true, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true, collection: CAMPAIGNS_COLLECTION },
);
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ status: 1, scheduledAt: 1 });

export const PushCampaignModel = model<PushCampaignRaw>('PushCampaign', campaignSchema);
