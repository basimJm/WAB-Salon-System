export { FakeAnalyticsProvider } from './fake';
export { createMongoAnalytics, type EventCounter } from './mongo';
export type { AnalyticsProvider, EventCountQuery, EventCountRow, IdentityLink } from './types';
export {
  createRealAnalytics,
  type ClosableAnalytics,
  type CollectionSource,
  type RealAnalyticsDeps,
} from './real';
