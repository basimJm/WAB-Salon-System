/** Admin reports (SRV-108, BUSINESS_DOMAIN.md §3.7/§9 `reports:aggregate`, Admin PRD A26). */
export const REPORTS_COLLECTION = 'reports';
export const ADMIN_REPORT_ROUTES = {
  base: '/reports',
  daily: '/daily',
  weekly: '/weekly',
  monthly: '/monthly',
} as const;
export const REPORT_WEEK_DAYS = 7;
/** Salons listed in the "top salons" part of the weekly and monthly reports. */
export const REPORT_TOP_SALONS = 10;
/** Where a month string `YYYY-MM` is accepted. */
export const REPORT_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const REPORT_MONTHS_PER_YEAR = 12;
export const REPORT_KIND_DAILY = 'DAILY';
