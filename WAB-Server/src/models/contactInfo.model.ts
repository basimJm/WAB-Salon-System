import { Schema, model } from 'mongoose';
import { CONTACT_INFO_COLLECTION, EMAIL_FIELD_MAX_LENGTH } from '../constants/appConfig';
import { APP_KINDS, type AppKind } from '../constants/enums';
import { E164_PATTERN, EMAIL_PATTERN } from '../constants/providers';

/** Support contacts shown by Contact Us (BUSINESS_DOMAIN.md §3.6). */
export interface ContactInfoRaw {
  app: AppKind;
  /** E.164, opened in the dialer. */
  phone: string;
  /** E.164, opened in WhatsApp. */
  whatsapp: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactInfoSchema = new Schema<ContactInfoRaw>(
  {
    app: { type: String, enum: APP_KINDS, required: true },
    phone: { type: String, required: true, match: E164_PATTERN },
    whatsapp: { type: String, required: true, match: E164_PATTERN },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: EMAIL_FIELD_MAX_LENGTH,
      match: EMAIL_PATTERN,
    },
  },
  { timestamps: true, collection: CONTACT_INFO_COLLECTION },
);
contactInfoSchema.index({ app: 1 }, { unique: true });

export const ContactInfoModel = model<ContactInfoRaw>('ContactInfo', contactInfoSchema);
