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
