/** Admin salon insights and the deletion-request decision (SRV-121, Admin PRD A13). */
export const ADMIN_SALON_INSIGHT_ROUTES = {
  base: '/salons',
  kpis: '/:id/kpis',
  analytics: '/:id/analytics',
  activity: '/:id/activity',
  deletionDecision: '/:id/deletion-request/decision',
} as const;

/** "Bookings (30d)": bookings created in the last 30 days. */
export const SALON_RECENT_DAYS = 30;
/** Longest analytics range an admin can ask for (a quarter), so one request stays cheap. */
export const SALON_ANALYTICS_MAX_DAYS = 92;
export const SALON_DELETION_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type SalonDeletionDecision = (typeof SALON_DELETION_DECISIONS)[number];
export const SALON_DELETION_AUDIT = {
  action: 'SALON_DELETION_DECISION',
  entityType: 'salon',
} as const;
/** Format of a calendar day in the analytics series (zone-free, `YYYY-MM-DD`). */
export const ANALYTICS_DAY_FORMAT = '%Y-%m-%d';
