import { Schema, model } from 'mongoose';
import { REPORT_KIND_DAILY, REPORTS_COLLECTION } from '../constants/reports';

/** One finished day's aggregates, stored so weekly/monthly reports add up cheaply. */
export interface ReportRaw {
  kind: typeof REPORT_KIND_DAILY;
  /** Business-calendar day `YYYY-MM-DD` (settings.timezone). */
  date: string;
  data: Record<string, unknown>;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportRaw>(
  {
    kind: { type: String, enum: [REPORT_KIND_DAILY], required: true },
    date: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, required: true },
  },
  { collection: REPORTS_COLLECTION, timestamps: true },
);
reportSchema.index({ kind: 1, date: 1 }, { unique: true });

export const ReportModel = model<ReportRaw>('Report', reportSchema);
