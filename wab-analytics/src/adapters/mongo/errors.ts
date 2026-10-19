import { ERROR_CODES } from '../../constants/codes';
import { AnalyticsError, isAnalyticsError } from '../../errors';

/** MongoDB server error codes the mapping knows. */
export const MONGO_CODES = {
  duplicateKey: 11000,
  maxTimeExpired: 50,
  unauthorized: 13,
  authenticationFailed: 18,
} as const;

const NETWORK_ERRORS = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

const field = (error: unknown, key: string): unknown =>
  typeof error === 'object' && error !== null ? (error as Record<string, unknown>)[key] : undefined;

export const isDuplicateKey = (error: unknown): boolean =>
  field(error, 'code') === MONGO_CODES.duplicateKey;

/** Every driver failure becomes a typed error; vendor text stays in `cause`, not in `message`. */
export const mapMongoError = (error: unknown): AnalyticsError => {
  if (isAnalyticsError(error)) return error;
  const name = field(error, 'name');
  const code = field(error, 'code');
  if (typeof name === 'string' && NETWORK_ERRORS.has(name)) {
    return new AnalyticsError(ERROR_CODES.ANALYTICS_UNAVAILABLE, 'event store is unreachable', {
      cause: error,
    });
  }
  if (name === 'MongoOperationTimeoutError' || code === MONGO_CODES.maxTimeExpired) {
    return new AnalyticsError(ERROR_CODES.TIMEOUT, 'event store query timed out', { cause: error });
  }
  if (code === MONGO_CODES.unauthorized || code === MONGO_CODES.authenticationFailed) {
    return new AnalyticsError(ERROR_CODES.AUTH_FAILED, 'event store rejected the credentials', {
      cause: error,
    });
  }
  if (name === 'MongoServerError') {
    return new AnalyticsError(ERROR_CODES.VENDOR_ERROR, 'event store returned an error', {
      cause: error,
    });
  }
  return new AnalyticsError(ERROR_CODES.UNKNOWN, 'unexpected event store failure', {
    cause: error,
  });
};
