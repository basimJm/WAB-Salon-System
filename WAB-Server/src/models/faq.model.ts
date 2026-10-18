import { Schema, model } from 'mongoose';
import { FAQS_COLLECTION } from '../constants/content';
import { APP_KINDS, type AppKind } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** One question and answer of an app's FAQ (BUSINESS_DOMAIN.md §3.6). */
export interface FaqRaw {
  app: AppKind;
  question: LocalizedName;
  answer: LocalizedName;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<FaqRaw>(
  {
    app: { type: String, enum: APP_KINDS, required: true },
    question: { type: localizedNameSchema, required: true },
    answer: { type: localizedNameSchema, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: FAQS_COLLECTION },
);
faqSchema.index({ app: 1, order: 1 });

export const FaqModel = model<FaqRaw>('Faq', faqSchema);
