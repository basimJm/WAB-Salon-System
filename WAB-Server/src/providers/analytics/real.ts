import { Types } from 'mongoose';
import {
  createAnalytics,
  isAnalyticsError,
  ERROR_CODES as SDK_ERRORS,
  type Analytics,
  type AnalyticsOptions,
  type IdCodec,
  type RedisLike,
} from '@wab/analytics';
import type { Redis } from 'ioredis';
import type { AnalyticsSettings } from '../../config';
import { SERVER_EVENTS_COLLECTION } from '../../constants/audit';
import { ANALYTICS_CACHE_TTL_SEC } from '../../constants/analytics';
import { OBJECT_ID_PATTERN } from '../../constants/database';
import { IDENTITY_LINKS_COLLECTION } from '../../constants/providers';
import type { ServerEventInput } from '../../domain/events';
import { ExternalServiceError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import type { AnalyticsProvider, EventCountQuery, EventCountRow, IdentityLink } from './types';

/** The provider plus the SDK (funnels, cohorts, journeys, overview) and shutdown. */
export interface ClosableAnalytics extends AnalyticsProvider {
  readonly sdk: Analytics;
  close(): Promise<void>;
}

/** Where the SDK finds MongoDB collections: `mongoose.connection` fits. */
export interface CollectionSource {
  collection(name: string): unknown;
}

export interface RealAnalyticsDeps {
  readonly settings: AnalyticsSettings;
  readonly mongo: CollectionSource;
  readonly redis: Redis;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the SDK factory (tests). */
  readonly build?: (options: AnalyticsOptions) => Analytics;
}

/** SDK errors that mean the caller sent something invalid: a bug here, not an outage. */
const CALLER_ERRORS: readonly string[] = [
  SDK_ERRORS.CONFIG_INVALID,
  SDK_ERRORS.VALIDATION_FAILED,
  SDK_ERRORS.ANALYTICS_EVENT_INVALID,
  SDK_ERRORS.ANALYTICS_RANGE_INVALID,
];

/** Server events store ids as ObjectId; ids that are not 24 hex characters stay text. */
export const objectIdCodec: IdCodec = {
  encode: (id) => (OBJECT_ID_PATTERN.test(id) ? new Types.ObjectId(id) : id),
  decode: (value) => String(value),
};

/** The SDK needs only get and set-with-expiry from the shared Redis client. */
export const toCacheRedis = (redis: Redis): RedisLike => ({
  get: (key) => redis.get(key),
  set: (key, value, mode, seconds) => redis.set(key, value, mode, seconds),
});

/** Vendor failures become typed 502/503 errors; the vendor text never reaches a client. */
export const mapAnalyticsError = (error: unknown): never => {
  if (!isAnalyticsError(error)) throw error;
  if (CALLER_ERRORS.includes(error.code)) {
    throw new RangeError(`analytics request rejected: ${error.code}`);
  }
  throw new ExternalServiceError({ cause: error, unavailable: error.retryable });
};

type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

/** `exactOptionalPropertyTypes`: drop keys whose value is `undefined`. */
const defined = <T extends object>(value: T): Defined<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, inner]) => inner !== undefined),
  ) as Defined<T>;

export const buildAnalyticsOptions = (deps: RealAnalyticsDeps): AnalyticsOptions => {
  const { bigquery } = deps.settings;
  return {
    environment: deps.isProduction ? 'prod' : 'dev',
    provider: 'mongo',
    mongo: {
      events: deps.mongo.collection(SERVER_EVENTS_COLLECTION) as object,
      identityLinks: deps.mongo.collection(IDENTITY_LINKS_COLLECTION) as object,
      ids: objectIdCodec,
    },
    cache: { store: 'redis', redis: toCacheRedis(deps.redis), ttlSec: ANALYTICS_CACHE_TTL_SEC },
    logger: toSdkLogger(deps.logger),
    ...(bigquery === undefined
      ? {}
      : {
          warehouse: {
            provider: 'bigquery' as const,
            bigquery: defined({
              projectId: bigquery.projectId,
              dataset: bigquery.dataset,
              location: bigquery.location,
              credentials: bigquery.credentialsJson,
              crashTable: bigquery.crashTable,
            }),
          },
          ...(bigquery.maxBytesBilled === undefined
            ? {}
            : { limits: { maxBytesBilled: bigquery.maxBytesBilled } }),
        }),
  };
};

export const createRealAnalytics = (deps: RealAnalyticsDeps): ClosableAnalytics => {
  const sdk = (deps.build ?? createAnalytics)(buildAnalyticsOptions(deps));
  // Index creation is idempotent; a failure must not stop the API from starting.
  sdk.init().catch((error: unknown) => {
    deps.logger.error({ err: error }, 'analytics indexes could not be created');
  });
  return {
    sdk,
    track: (event: ServerEventInput) => sdk.track(defined(event)),
    async linkIdentity(link: IdentityLink): Promise<void> {
      try {
        await sdk.linkIdentity(link);
      } catch (error) {
        mapAnalyticsError(error);
      }
    },
    async countEvents(query: EventCountQuery): Promise<EventCountRow[]> {
      try {
        return await sdk.countEvents(defined(query));
      } catch (error) {
        return mapAnalyticsError(error);
      }
    },
    close: () => sdk.close(),
  };
};
