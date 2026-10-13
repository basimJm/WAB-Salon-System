import { Schema, model, type Types } from 'mongoose';
import {
  ALERT_KINDS,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERT_TITLE_MAX_LENGTH,
  ALERTS_COLLECTION,
  type AlertKind,
  type AlertSeverity,
  type AlertStatus,
} from '../constants/alerts';

/** One admin alert (BUSINESS_DOMAIN.md §3.7). */
export interface AlertRaw {
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  data: Record<string, unknown>;
  status: AlertStatus;
  emailedAt?: Date;
  acknowledgedAt?: Date;
  /** Extension: one alert per occurrence (unique), so a repeated evaluation raises nothing new. */
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<AlertRaw>(
  {
    kind: { type: String, enum: ALERT_KINDS, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    title: { type: String, required: true, maxlength: ALERT_TITLE_MAX_LENGTH },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    data: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ALERT_STATUSES, default: 'NEW' },
    emailedAt: { type: Date },
    acknowledgedAt: { type: Date },
    dedupeKey: { type: String, required: true },
  },
  { collection: ALERTS_COLLECTION, timestamps: true },
);
alertSchema.index({ dedupeKey: 1 }, { unique: true });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ emailedAt: 1, createdAt: 1 });

export const AlertModel = model<AlertRaw>('Alert', alertSchema);
