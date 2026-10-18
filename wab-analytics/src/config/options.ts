import { z } from 'zod';
import {
  CACHE_STORES,
  DEFAULT_BIGQUERY,
  DEFAULT_CACHE,
  DEFAULT_COLLECTIONS,
  DEFAULT_LIMITS,
  DEFAULT_RETRY,
  DEFAULT_SESSION_GAP_MS,
  DEFAULT_TIME_ZONE,
  DEFAULT_TIMEOUTS,
  ENVIRONMENTS,
  EVENT_RULES,
  STORE_PROVIDERS,
  WAREHOUSE_PROVIDERS,
} from '../constants/defaults';
import { configError } from '../errors';
import { isValidTimeZone } from '../time';
import { noopLogger, redactingLogger, type Logger } from '../logger';

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const identifier = z.string().regex(EVENT_RULES.identifierPattern);
const injected = z.custom<object>((value) => typeof value === 'object' && value !== null);

const limitsSchema = z
  .object({
    maxRangeDays: positiveInt.default(DEFAULT_LIMITS.maxRangeDays),
    maxScannedEvents: positiveInt.default(DEFAULT_LIMITS.maxScannedEvents),
    maxFunnelSteps: positiveInt.default(DEFAULT_LIMITS.maxFunnelSteps),
    maxCohortPeriods: positiveInt.default(DEFAULT_LIMITS.maxCohortPeriods),
    maxJourneyItems: positiveInt.default(DEFAULT_LIMITS.maxJourneyItems),
    maxNames: positiveInt.default(DEFAULT_LIMITS.maxNames),
    topEvents: positiveInt.default(DEFAULT_LIMITS.topEvents),
    maxCountRows: positiveInt.default(DEFAULT_LIMITS.maxCountRows),
    maxBytesBilled: positiveInt.default(DEFAULT_LIMITS.maxBytesBilled),
  })
  .strict();

const retrySchema = z
  .object({
    attempts: positiveInt.default(DEFAULT_RETRY.attempts),
    baseDelayMs: nonNegativeInt.default(DEFAULT_RETRY.baseDelayMs),
    maxDelayMs: nonNegativeInt.default(DEFAULT_RETRY.maxDelayMs),
  })
  .strict();

const mongoSchema = z
  .object({
    /** Native collection (mongodb driver / `mongoose.connection.collection(...)`). */
    events: injected,
    identityLinks: injected,
    /** Converts string ids to the stored type and back (e.g. ObjectId); identity by default. */
    ids: injected.optional(),
    ensureIndexes: z.boolean().default(true),
  })
  .strict();

const bigquerySchema = z
  .object({
    projectId: identifier.optional(),
    dataset: identifier.optional(),
    location: z.string().min(1).max(64).optional(),
    /** Service-account JSON (object or string) — a secret supplied by the consumer. */
    credentials: z.union([z.string().min(2), injected]).optional(),
    eventsPrefix: identifier.default(DEFAULT_BIGQUERY.eventsPrefix),
    intradayPrefix: identifier.default(DEFAULT_BIGQUERY.intradayPrefix),
    crashTable: identifier.optional(),
    dryRunFirst: z.boolean().default(DEFAULT_BIGQUERY.dryRunFirst),
    /** Injected client (tests, custom auth); otherwise `@google-cloud/bigquery` is loaded. */
    client: injected.optional(),
  })
  .strict();

const warehouseSchema = z
  .object({
    provider: z.enum(WAREHOUSE_PROVIDERS).default('none'),
    bigquery: bigquerySchema.optional(),
  })
  .strict();

const cacheSchema = z
  .object({
    store: z.enum(CACHE_STORES).default('none'),
    ttlSec: positiveInt.default(DEFAULT_CACHE.ttlSec),
    keyPrefix: z.string().min(1).max(64).default(DEFAULT_CACHE.keyPrefix),
    /** Redis-like client (`get`, `set` with expiry). */
    redis: injected.optional(),
    /** Custom cache adapter replacing the built-in ones. */
    custom: injected.optional(),
  })
  .strict();

const optionsSchema = z
  .object({
    environment: z.enum(ENVIRONMENTS),
    provider: z.enum(STORE_PROVIDERS).optional(),
    timeZone: z.string().default(DEFAULT_TIME_ZONE),
    mongo: mongoSchema.optional(),
    warehouse: warehouseSchema.prefault({}),
    limits: limitsSchema.prefault({}),
    queryTimeoutMs: positiveInt.default(DEFAULT_TIMEOUTS.queryMs),
    retry: retrySchema.prefault({}),
    cache: cacheSchema.prefault({}),
    sessionGapMs: positiveInt.default(DEFAULT_SESSION_GAP_MS),
    /** Extra patterns for ids when the consumer's ids differ from the defaults. */
    idPattern: z.instanceof(RegExp).default(EVENT_RULES.idPattern),
    installationPattern: z.instanceof(RegExp).default(EVENT_RULES.installationPattern),
    collections: z
      .object({
        events: identifier.default(DEFAULT_COLLECTIONS.events),
        identityLinks: identifier.default(DEFAULT_COLLECTIONS.identityLinks),
      })
      .prefault({}),
    /** Also record an `identity.linked` event when a link is stored. */
    trackIdentityEvent: z.boolean().default(true),
    logger: injected.optional(),
  })
  .strict();

export type AnalyticsOptions = z.input<typeof optionsSchema>;
export type ResolvedOptions = Omit<z.output<typeof optionsSchema>, 'logger' | 'provider'> & {
  readonly provider: 'memory' | 'mongo';
  readonly logger: Logger;
};
export type ResolvedLimits = ResolvedOptions['limits'];

/** Names the failing option paths only; values (possibly secrets) are never echoed. */
const fail = (message: string, paths: string[]): never => {
  throw configError(message, { paths });
};

const assertProd = (options: ResolvedOptions): void => {
  if (options.provider !== 'mongo' || options.mongo === undefined) {
    fail('prod requires provider "mongo" with mongo collections', ['provider', 'mongo']);
  }
  const { warehouse } = options;
  if (warehouse.provider === 'memory') fail('prod refuses the memory warehouse', ['warehouse']);
};

const assertWarehouse = (options: ResolvedOptions): void => {
  const { warehouse, environment } = options;
  if (warehouse.provider !== 'bigquery') return;
  const bq = warehouse.bigquery;
  if (bq?.projectId === undefined || bq.dataset === undefined) {
    fail('bigquery requires projectId and dataset', [
      'warehouse.bigquery.projectId',
      'warehouse.bigquery.dataset',
    ]);
  }
  if (environment === 'prod' && bq?.credentials === undefined && bq?.client === undefined) {
    fail('prod bigquery requires credentials', ['warehouse.bigquery.credentials']);
  }
};

/** Validates the options and fills defaults. Throws `CONFIG_INVALID` naming only option paths. */
export const resolveOptions = (input: AnalyticsOptions): ResolvedOptions => {
  const parsed = optionsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      'invalid analytics options',
      parsed.error.issues.map((issue) => issue.path.join('.')),
    );
  }
  const data = parsed.data;
  if (!isValidTimeZone(data.timeZone)) fail('unknown time zone', ['timeZone']);
  if (data.cache.store === 'redis' && data.cache.redis === undefined) {
    fail('redis cache requires a redis client', ['cache.redis']);
  }
  const provider = data.provider ?? (data.environment === 'dev' ? 'memory' : 'mongo');
  if (provider === 'mongo' && data.mongo === undefined) {
    fail('provider "mongo" requires mongo collections', ['mongo']);
  }
  const { logger: injectedLogger, ...rest } = data;
  const logger = injectedLogger === undefined ? noopLogger : (injectedLogger as Logger);
  const resolved: ResolvedOptions = { ...rest, provider, logger: redactingLogger(logger) };
  if (data.environment === 'prod') assertProd(resolved);
  assertWarehouse(resolved);
  return resolved;
};
