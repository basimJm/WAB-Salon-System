import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../constants/database';
import {
  BOOKING_PAYMENT_STATUSES,
  BOOKING_STATUSES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../../constants/enums';
import { EXPORT_FORMATS } from '../../constants/exports';
import { REPORT_MONTH_PATTERN } from '../../constants/reports';
import { isLocalDate } from '../../utils/time';

const objectId = z.string().regex(OBJECT_ID_PATTERN);
const instant = z.iso.datetime({ offset: true });
const day = z.string().refine((value) => isLocalDate(value));

/** What an admin may export, with the filters of the matching screen (dates stay ISO strings). */
export const exportRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('REPORT_DAILY'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({ date: day }),
  }),
  z.object({
    kind: z.literal('REPORT_WEEKLY'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({ from: day }),
  }),
  z.object({
    kind: z.literal('REPORT_MONTHLY'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({ month: z.string().regex(REPORT_MONTH_PATTERN) }),
  }),
  z.object({
    kind: z.literal('TRANSACTIONS'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({
      status: z.enum(TRANSACTION_STATUSES).optional(),
      type: z.enum(TRANSACTION_TYPES).optional(),
      salonId: objectId.optional(),
      customerId: objectId.optional(),
      bookingId: objectId.optional(),
      from: instant.optional(),
      to: instant.optional(),
    }),
  }),
  z.object({
    kind: z.literal('AUDIT_LOGS'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({
      adminId: objectId.optional(),
      action: z.string().min(1).max(100).optional(),
      entityType: z.string().min(1).max(100).optional(),
      entityId: z.string().min(1).max(100).optional(),
      from: instant.optional(),
      to: instant.optional(),
    }),
  }),
  z.object({
    kind: z.literal('BOOKINGS'),
    format: z.enum(EXPORT_FORMATS),
    params: z.object({
      statuses: z.array(z.enum(BOOKING_STATUSES)).min(1).max(BOOKING_STATUSES.length).optional(),
      paymentStatus: z.enum(BOOKING_PAYMENT_STATUSES).optional(),
      salonId: objectId.optional(),
      customerId: objectId.optional(),
      /** Appointment days (Asia/Amman), both inclusive. */
      from: day.optional(),
      to: day.optional(),
      q: z.string().trim().min(1).max(100).optional(),
    }),
  }),
]);
export type ExportRequest = z.infer<typeof exportRequestSchema>;
