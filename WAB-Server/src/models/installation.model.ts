import { Schema, model, type Types } from 'mongoose';
import {
  APP_KINDS,
  LANGUAGES,
  PLATFORMS,
  type AppKind,
  type Language,
  type Platform,
} from '../constants/enums';
import {
  APP_VERSION_MAX_LENGTH,
  DEVICE_TEXT_MAX_LENGTH,
  FCM_TOKEN_MAX_LENGTH,
  INSTALLATIONS_COLLECTION,
} from '../constants/identity';
import { INSTALLATION_ID_PATTERN } from '../constants/providers';

/** A device/app instance: push token holder and the analytics identity link (BUSINESS_DOMAIN.md §3.1). */
export interface InstallationRaw {
  installationId: string;
  app: AppKind;
  platform: Platform;
  appVersion: string;
  osVersion?: string;
  deviceModel?: string;
  language: Language;
  fcmToken?: string;
  fcmTokenUpdatedAt?: Date;
  /** Set on login, cleared on logout. */
  customerId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const installationSchema = new Schema<InstallationRaw>(
  {
    installationId: { type: String, required: true, match: INSTALLATION_ID_PATTERN },
    app: { type: String, enum: APP_KINDS, required: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    appVersion: { type: String, required: true, maxlength: APP_VERSION_MAX_LENGTH },
    osVersion: { type: String, maxlength: DEVICE_TEXT_MAX_LENGTH },
    deviceModel: { type: String, maxlength: DEVICE_TEXT_MAX_LENGTH },
    language: { type: String, enum: LANGUAGES, default: 'ar' },
    fcmToken: { type: String, maxlength: FCM_TOKEN_MAX_LENGTH },
    fcmTokenUpdatedAt: { type: Date },
    customerId: { type: Schema.Types.ObjectId },
    memberId: { type: Schema.Types.ObjectId },
    lastSeenAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: INSTALLATIONS_COLLECTION },
);
installationSchema.index({ app: 1, installationId: 1 }, { unique: true });
installationSchema.index({ customerId: 1 });
installationSchema.index({ memberId: 1 });
installationSchema.index({ fcmToken: 1 });

export const InstallationModel = model<InstallationRaw>('Installation', installationSchema);
