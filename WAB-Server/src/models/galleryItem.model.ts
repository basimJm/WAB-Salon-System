import { Schema, model, type Types } from 'mongoose';
import { GALLERY_COLLECTION, GALLERY_TYPES, type GalleryType } from '../constants/gallery';

/** One picture or video of a salon's portfolio (BUSINESS_DOMAIN.md §3.3). */
export interface GalleryItemRaw {
  salonId: Types.ObjectId;
  type: GalleryType;
  key: string;
  thumbnailKey?: string;
  durationSec?: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<GalleryItemRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    type: { type: String, enum: GALLERY_TYPES, required: true },
    key: { type: String, required: true },
    thumbnailKey: { type: String },
    durationSec: { type: Number, min: 1 },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: GALLERY_COLLECTION },
);
galleryItemSchema.index({ salonId: 1, order: 1 });

export const GalleryItemModel = model<GalleryItemRaw>('GalleryItem', galleryItemSchema);
