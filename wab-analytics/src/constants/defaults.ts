/** Default values. Every one can be overridden through the options passed to `createAnalytics`. */
export const ENVIRONMENTS = ['dev', 'prod'] as const;
export const STORE_PROVIDERS = ['memory', 'mongo'] as const;
export const WAREHOUSE_PROVIDERS = ['none', 'memory', 'bigquery'] as const;
export const CACHE_STORES = ['none', 'memory', 'redis', 'custom'] as const;
export const GROUPINGS = ['NAME', 'DAY'] as const;
export const EVENT_SOURCES = ['SERVER', 'APP'] as const;
export const COHORT_UNITS = ['DAY', 'WEEK'] as const;
export const JOURNEY_SOURCES = ['SERVER', 'APP', 'CRASH'] as const;

export const DEFAULT_TIME_ZONE = 'Asia/Amman';
export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;
export const DAYS_PER_WEEK = 7;

export const DEFAULT_LIMITS = {
  /** Longest range one query may cover. */
  maxRangeDays: 92,
  /** Events one funnel / cohort / journey may read before the result is marked truncated. */
  maxScannedEvents: 50_000,
  maxFunnelSteps: 10,
  minFunnelSteps: 2,
  maxDropOffUsers: 100,
  maxCohortPeriods: 12,
  maxJourneyItems: 500,
  maxNames: 20,
  topEvents: 10,
  maxCountRows: 1_000,
  /** BigQuery cost guard (bytes). */
  maxBytesBilled: 10_000_000_000,
} as const;

export const DEFAULT_TIMEOUTS = {
  queryMs: 30_000,
} as const;

export const DEFAULT_RETRY = {
  attempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
  jitterRatio: 0.5,
} as const;

export const DEFAULT_CACHE = {
  ttlSec: 60,
  /** Extra time a stale answer may be served while it refreshes in the background (0 = off). */
  staleSec: 0,
  /** Entries the in-memory cache keeps. */
  maxEntries: 500,
  hashLength: 32,
  keyPrefix: 'wab-analytics',
} as const;

export const DEFAULT_SESSION_GAP_MS = 30 * MS_PER_MINUTE;
export const DEFAULT_FUNNEL_WINDOW_MS = 7 * MS_PER_DAY;

export const DEFAULT_COLLECTIONS = {
  events: 'serverEvents',
  identityLinks: 'identityLinks',
} as const;

/** Event recorded when an identity link is stored (keeps older journeys readable). */
export const IDENTITY_LINKED_EVENT = 'identity.linked';

export const DEFAULT_BIGQUERY = {
  eventsPrefix: 'events_',
  intradayPrefix: 'events_intraday_',
  dryRunFirst: true,
} as const;

/** Event/identity formats; the consumer can override the id and installation patterns. */
export const EVENT_RULES = {
  namePattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
  nameMaxLength: 80,
  typePattern: /^[A-Z][A-Z0-9_]{0,31}$/,
  idPattern: /^[A-Za-z0-9._:-]{1,128}$/,
  installationPattern: /^[A-Za-z0-9._-]{8,128}$/,
  appVersionMaxLength: 32,
  maxParamsBytes: 8192,
  platformPattern: /^[A-Z][A-Z0-9_]{0,15}$/,
  identifierPattern: /^[A-Za-z0-9_-]{1,128}$/,
} as const;

/** Parameter keys whose values are never stored (privacy, ANF-03). */
export const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|otp|authorization|cookie|iban|card|cvv/i;
export const REDACTED = '[redacted]';
export const MAX_PARAM_DEPTH = 4;

/** Mongo adapter bounds. */
export const MONGO_RULES = {
  /** Links read per lookup. */
  maxLinks: 1000,
  /** Actors one `find` may filter on. */
  maxActorsPerFind: 200,
  dayFormat: '%Y-%m-%d',
} as const;

/** BigQuery export layout (Firebase Analytics / Crashlytics) and query constants. */
export const BIGQUERY_RULES = {
  /** Days added on both sides of the suffix range (export dates use the property time zone). */
  suffixPadDays: 1,
  screenParam: 'firebase_screen',
  microsPerMs: 1000,
  jobLabels: { app: 'wab-analytics' },
} as const;

/** Network error codes that mean "could not reach the service". */
export const NETWORK_ERROR_CODES: readonly string[] = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
];
