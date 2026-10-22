/** Async exports of admin tables and reports (SRV-109, BUSINESS_DOMAIN.md §3.7 `exports`, Admin PRD §3). */
export const EXPORTS_COLLECTION = 'exports';
export const ADMIN_EXPORT_ROUTES = { base: '/exports', byId: '/:id' } as const;
export const EXPORT_KINDS = [
  'REPORT_DAILY',
  'REPORT_WEEKLY',
  'REPORT_MONTHLY',
  'TRANSACTIONS',
  'AUDIT_LOGS',
  'BOOKINGS',
] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];
export const EXPORT_FORMATS = ['XLSX', 'CSV', 'PDF'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export const EXPORT_STATUSES = ['QUEUED', 'RUNNING', 'DONE', 'FAILED'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];
export const EXPORT_JOB_NAME = 'export.run';
/** Rows one export may hold; a bigger table fails with `TOO_MANY_ROWS` (narrow the filter). */
export const EXPORT_MAX_ROWS = 10_000;
/** Rows fetched per page while building a table. */
export const EXPORT_PAGE_SIZE = 100;
/** The download link lives this long. */
export const EXPORT_URL_TTL_SEC = 300;
export const EXPORT_KEY_PREFIX = 'exports';
/** A RUNNING export untouched this long is considered lost (process died) and queued again. */
export const EXPORT_STALE_RUNNING_MS = 600_000;
export const EXPORT_FAILURE_CODES = ['TOO_MANY_ROWS', 'GENERATION_FAILED'] as const;
export type ExportFailureCode = (typeof EXPORT_FAILURE_CODES)[number];
export const EXPORT_FILES: Readonly<
  Record<ExportFormat, { readonly extension: string; readonly contentType: string }>
> = {
  XLSX: {
    extension: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  CSV: { extension: 'csv', contentType: 'text/csv; charset=utf-8' },
  PDF: { extension: 'pdf', contentType: 'application/pdf' },
};
/** Audit reason of an export request (the request body has no reason field). */
export const EXPORT_AUDIT = {
  action: 'EXPORT_REQUEST',
  entityType: 'EXPORT',
  reason: 'Data export',
} as const;
/** Excel opens UTF-8 CSV correctly only with this byte order mark. */
export const CSV_BOM = '﻿';
export const PDF_FONT_SIZE = 9;
export const PDF_TITLE_SIZE = 14;
export const PDF_MARGIN = 36;
export const PDF_ROW_HEIGHT = 16;
