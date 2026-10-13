import { Schema, model, type Types } from 'mongoose';
import {
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_TYPES,
  type NotificationRecipientType,
  type NotificationType,
} from '../constants/enums';
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
  NOTIFICATIONS_COLLECTION,
} from '../constants/notifications';

export interface NotificationText {
  ar: string;
  en: string;
}

/** One in-app notification for one recipient (BUSINESS_DOMAIN.md §3.6); the push is a copy of it. */
export interface NotificationRaw {
  recipientType: NotificationRecipientType;
  recipientId: Types.ObjectId;
  type: NotificationType;
  event: string;
  title: NotificationText;
  body: NotificationText;
  data: { bookingId?: string; salonId?: string; deepLink?: string };
  readAt?: Date;
  pushSent: boolean;
  pushResult?: string;
  /** One logical notification per recipient: a repeated trigger (retried job) never doubles it. */
  dedupeKey: string;
  createdAt: Date;
}

const text = (max: number): Schema<NotificationText> =>
  new Schema<NotificationText>(
    {
      ar: { type: String, required: true, maxlength: max },
      en: { type: String, required: true, maxlength: max },
    },
    { _id: false },
  );

const notificationSchema = new Schema<NotificationRaw>(
  {
    recipientType: { type: String, enum: NOTIFICATION_RECIPIENT_TYPES, required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    event: { type: String, required: true },
    title: { type: text(NOTIFICATION_TITLE_MAX_LENGTH), required: true },
    body: { type: text(NOTIFICATION_BODY_MAX_LENGTH), required: true },
    data: {
      type: new Schema({ bookingId: String, salonId: String, deepLink: String }, { _id: false }),
      default: () => ({}),
    },
    readAt: { type: Date },
    pushSent: { type: Boolean, required: true, default: false },
    pushResult: { type: String },
    dedupeKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: NOTIFICATIONS_COLLECTION },
);
notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, readAt: 1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, dedupeKey: 1 }, { unique: true });
// Campaign statistics count the copies of one campaign (SRV-099).
notificationSchema.index({ event: 1, dedupeKey: 1 });

export const NotificationModel = model<NotificationRaw>('Notification', notificationSchema);
