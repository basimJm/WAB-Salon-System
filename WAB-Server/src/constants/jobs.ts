import { MS_PER_MINUTE, MS_PER_SECOND } from './time';

/** Background jobs (SRV-095, BUSINESS_DOMAIN.md §9). */
export const JOB_QUEUE_NAME = 'wab-jobs';
/** Keeps BullMQ keys apart from the server's own `lock:`/`hold:`/`rate:` keys. */
export const JOB_KEY_PREFIX = 'jobs';
/** BullMQ forbids `:` in custom job ids, so the §9 names (`booking:reminder:{id}:60`) use a dot. */
export const JOB_ID_SEPARATOR = '.';

/** A failed job is retried with exponential backoff, then kept visible in the failed set. */
export const JOB_MAX_ATTEMPTS = 5;
export const JOB_BACKOFF_BASE_MS = 5 * MS_PER_SECOND;
/** How many finished/failed jobs stay in Redis: failures for inspection, successes not at all. */
export const JOB_KEEP_FAILED = 500;
export const JOB_WORKER_CONCURRENCY = 5;
/** A job that ran longer than this is considered stalled and picked up again. */
export const JOB_LOCK_DURATION_MS = 5 * MS_PER_MINUTE;

export const JOB_SERVER_EVENTS = {
  failed: 'job.failed',
  exhausted: 'job.exhausted',
} as const;

/**
 * Recurring jobs (SRV-097, BUSINESS_DOMAIN.md §9). Cron is evaluated in the business time zone
 * (`settings.timezone`), so "09:00" is 09:00 Amman all year.
 * Not scheduled on purpose: `draft:expire` (hold keys carry their own expiry and the draft TTL
 * index deletes the rows) and `placements:expire` (a placement's status is derived from its dates).
 */
export const PERIODIC_JOBS = {
  subscriptionsCheck: { name: 'periodic.subscriptions-check', cron: '0 9 * * *' },
  accountsPurge: { name: 'periodic.accounts-purge', cron: '0 3 * * *' },
  refundsRetry: { name: 'periodic.refunds-retry', cron: '*/5 * * * *' },
  refundsDelayed: { name: 'periodic.refunds-delayed', cron: '0 * * * *' },
  paymentsReconcile: { name: 'periodic.payments-reconcile', cron: '*/5 * * * *' },
  ledgerReconcile: { name: 'periodic.ledger-reconcile', cron: '20 2 * * *' },
  alertsEmail: { name: 'periodic.alerts-email', cron: '*/5 * * * *' },
  alertsEvaluate: { name: 'periodic.alerts-evaluate', cron: '*/5 * * * *' },
  bookingJobsReconcile: { name: 'periodic.booking-jobs-reconcile', cron: '15 * * * *' },
} as const;
