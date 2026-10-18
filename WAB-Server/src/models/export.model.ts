import { Schema, model, type Types } from 'mongoose';
import {
  EXPORT_FAILURE_CODES,
  EXPORT_FORMATS,
  EXPORT_KINDS,
  EXPORT_STATUSES,
  EXPORTS_COLLECTION,
  type ExportFailureCode,
  type ExportFormat,
  type ExportKind,
  type ExportStatus,
} from '../constants/exports';

/** One requested export (BUSINESS_DOMAIN.md §3.7). */
export interface ExportRaw {
  kind: ExportKind;
  format: ExportFormat;
  params: Record<string, unknown>;
  status: ExportStatus;
  /** Private storage key of the finished file. */
  fileKey?: string;
  rowCount?: number;
  failure?: ExportFailureCode;
  requestedBy: Types.ObjectId;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exportSchema = new Schema<ExportRaw>(
  {
    kind: { type: String, enum: EXPORT_KINDS, required: true },
    format: { type: String, enum: EXPORT_FORMATS, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: EXPORT_STATUSES, default: 'QUEUED' },
    fileKey: { type: String },
    rowCount: { type: Number, min: 0 },
    failure: { type: String, enum: EXPORT_FAILURE_CODES },
    requestedBy: { type: Schema.Types.ObjectId, required: true },
    finishedAt: { type: Date },
  },
  { collection: EXPORTS_COLLECTION, timestamps: true },
);
exportSchema.index({ requestedBy: 1, createdAt: -1 });
exportSchema.index({ status: 1, updatedAt: 1 });

export const ExportModel = model<ExportRaw>('Export', exportSchema);
