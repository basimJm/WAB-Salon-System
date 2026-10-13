import { Schema, model } from 'mongoose';
import { MAINTENANCE_COLLECTION, MAINTENANCE_MESSAGE_MAX_LENGTH } from '../constants/appConfig';
import { APP_KINDS, type AppKind } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';

/** Maintenance switch of one app (BUSINESS_DOMAIN.md §3.6). */
export interface MaintenanceRaw {
  app: AppKind;
  enabled: boolean;
  message: LocalizedName;
  createdAt: Date;
  updatedAt: Date;
}

const messageText = {
  type: String,
  required: true,
  trim: true,
  maxlength: MAINTENANCE_MESSAGE_MAX_LENGTH,
};

const maintenanceSchema = new Schema<MaintenanceRaw>(
  {
    app: { type: String, enum: APP_KINDS, required: true },
    enabled: { type: Boolean, default: false },
    message: {
      type: new Schema({ ar: messageText, en: messageText }, { _id: false }),
      required: true,
    },
  },
  { timestamps: true, collection: MAINTENANCE_COLLECTION },
);
maintenanceSchema.index({ app: 1 }, { unique: true });

export const MaintenanceModel = model<MaintenanceRaw>('Maintenance', maintenanceSchema);
