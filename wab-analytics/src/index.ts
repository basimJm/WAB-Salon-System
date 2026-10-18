/** Package identity, used in logs and error details. */
export const PACKAGE_NAME = '@wab/analytics';

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
