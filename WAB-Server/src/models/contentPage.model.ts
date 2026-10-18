import { Schema, model } from 'mongoose';
import { CONTENT_KINDS, CONTENT_PAGES_COLLECTION, type ContentKind } from '../constants/content';
import { APP_KINDS, type AppKind } from '../constants/enums';
import type { LocalizedName } from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** Privacy policy, terms or about text of one app (BUSINESS_DOMAIN.md §3.6). */
export interface ContentPageRaw {
  app: AppKind;
  kind: ContentKind;
  body: LocalizedName;
  createdAt: Date;
  updatedAt: Date;
}

const contentPageSchema = new Schema<ContentPageRaw>(
  {
    app: { type: String, enum: APP_KINDS, required: true },
    kind: { type: String, enum: CONTENT_KINDS, required: true },
    body: { type: localizedNameSchema, required: true },
  },
  { timestamps: true, collection: CONTENT_PAGES_COLLECTION },
);
contentPageSchema.index({ app: 1, kind: 1 }, { unique: true });

export const ContentPageModel = model<ContentPageRaw>('ContentPage', contentPageSchema);
