import { Schema, model, type Types } from 'mongoose';
import {
  CATALOG_REQUESTS_COLLECTION,
  CATALOG_REQUEST_DESCRIPTION_MAX_LENGTH,
  CATALOG_REQUEST_NAME_MAX_LENGTH,
  CATALOG_REQUEST_NOTE_MAX_LENGTH,
  CATALOG_REQUEST_STATUSES,
  type CatalogRequestStatus,
} from '../constants/salonServices';

/** A salon asks the admin to add a service to the catalog (BUSINESS_DOMAIN.md §3.2). */
export interface CatalogRequestRaw {
  salonId: Types.ObjectId;
  requestedByMemberId: Types.ObjectId;
  name: string;
  description: string;
  imageKey?: string;
  status: CatalogRequestStatus;
  adminNote?: string;
  /** Set when approved: the catalog service that was created. */
  catalogServiceId?: Types.ObjectId;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const catalogRequestSchema = new Schema<CatalogRequestRaw>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
    requestedByMemberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    name: { type: String, required: true, trim: true, maxlength: CATALOG_REQUEST_NAME_MAX_LENGTH },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: CATALOG_REQUEST_DESCRIPTION_MAX_LENGTH,
    },
    imageKey: { type: String },
    status: { type: String, enum: CATALOG_REQUEST_STATUSES, default: 'PENDING' },
    adminNote: { type: String, maxlength: CATALOG_REQUEST_NOTE_MAX_LENGTH },
    catalogServiceId: { type: Schema.Types.ObjectId, ref: 'CatalogService' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    decidedAt: { type: Date },
  },
  { timestamps: true, collection: CATALOG_REQUESTS_COLLECTION },
);
catalogRequestSchema.index({ salonId: 1, createdAt: -1 });
// The admin queue: oldest pending first.
catalogRequestSchema.index({ status: 1, createdAt: 1 });

export const CatalogRequestModel = model<CatalogRequestRaw>('CatalogRequest', catalogRequestSchema);
