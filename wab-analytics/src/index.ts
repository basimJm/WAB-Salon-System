/** Package identity, used in logs and error details. */
export const PACKAGE_NAME = '@wab/analytics';

export { createAnalytics, buildAdapters, type Adapters } from './analytics';
export { createService, type ServiceDeps } from './service';
export { ERROR_CODES, type ErrorCode } from './constants/codes';
export {
  AnalyticsError,
  isAnalyticsError,
  toAnalyticsError,
  type AnalyticsErrorOptions,
} from './errors';
export { noopLogger, redact, type Logger } from './logger';
export { resolveOptions, type AnalyticsOptions, type ResolvedOptions } from './config/options';
export { assertRange, type DateRange } from './range';
export { withRetry, type RetryPolicy } from './retry';
export { MemoryEventStore } from './adapters/memory/eventStore';
export { MemoryIdentityStore } from './adapters/memory/identityStore';
export { MemoryCache, RedisCache } from './cache/stores';
export { cacheKey, stableStringify } from './cache/keys';
export { createQueryCache, type QueryCache } from './cache/queryCache';
export { MemoryWarehouse } from './adapters/memory/warehouse';
export { MongoEventStore } from './adapters/mongo/eventStore';
export { MongoIdentityStore } from './adapters/mongo/identityStore';
export type {
  IdCodec,
  MongoCollectionLike,
  MongoCursorLike,
  MongoDoc,
  MongoFindCursorLike,
} from './adapters/mongo/types';
export type {
  AppEvent,
  CrashEvent,
  EventStore,
  IdentityStore,
  Lifecycle,
  RedisLike,
  ResultCache,
  ParamValue,
  StoreCountQuery,
  StoreFindQuery,
  WarehouseFindQuery,
  WarehouseQuery,
} from './ports';
export type * from './types';
