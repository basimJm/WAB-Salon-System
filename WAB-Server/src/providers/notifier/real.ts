import type { Redis } from 'ioredis';
import {
  createNotifier,
  isNotificationError,
  RedisIdempotencyStore,
  type Logger as SdkLogger,
  type NotifierOptions,
  type RedisLike,
} from 'wab-notifications';
import type { NotifierSettings } from '../../config';
import { ERROR_CODES as SDK_ERRORS } from 'wab-notifications';
import { ExternalServiceError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { EmailRequest, EmailResult, Notifier, PushRequest, PushResult } from './types';

/** Notifier backed by the `wab-notifications` SDK; `close` releases its connections. */
export interface ClosableNotifier extends Notifier {
  close(): Promise<void>;
}

export interface RealNotifierDeps {
  readonly settings: NotifierSettings;
  readonly redis: Redis;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the SDK factory (tests). */
  readonly build?: (options: NotifierOptions) => ClosableNotifier;
}

/** SDK errors that mean the caller sent something invalid: a bug here, not a provider outage. */
const CALLER_ERRORS: readonly string[] = [
  SDK_ERRORS.CONFIG_INVALID,
  SDK_ERRORS.VALIDATION_FAILED,
  SDK_ERRORS.PAYLOAD_INVALID,
];

/** pino takes `(fields, message)`, the SDK takes `(message, fields)`. */
export const toSdkLogger = (logger: Logger): SdkLogger => ({
  debug: (message, fields) => {
    logger.debug({ ...fields }, message);
  },
  info: (message, fields) => {
    logger.info({ ...fields }, message);
  },
  warn: (message, fields) => {
    logger.warn({ ...fields }, message);
  },
  error: (message, fields) => {
    logger.error({ ...fields }, message);
  },
});

/** The SDK needs only get / set-with-expiry / del from the shared Redis client. */
export const toRedisLike = (redis: Redis): RedisLike => ({
  get: (key) => redis.get(key),
  set: async (key, value, _mode, seconds, setMode) => {
    const reply =
      setMode === 'NX'
        ? await redis.set(key, value, 'EX', seconds, 'NX')
        : await redis.set(key, value, 'EX', seconds);
    return reply;
  },
  del: (key) => redis.del(key),
});

/** Provider failures become typed 502/503 errors; the vendor text never reaches a client. */
export const mapSdkError = (error: unknown): never => {
  if (!isNotificationError(error)) throw error;
  if (CALLER_ERRORS.includes(error.code))
    throw new RangeError(`notifier request rejected: ${error.code}`);
  throw new ExternalServiceError({ cause: error, unavailable: error.retryable });
};

export const createRealNotifier = (deps: RealNotifierDeps): ClosableNotifier => {
  const { settings } = deps;
  const options: NotifierOptions = {
    environment: deps.isProduction ? 'prod' : 'dev',
    push: {
      provider: 'fcm',
      credentials: settings.fcm.serviceAccountJson,
      ...(settings.fcm.projectId === undefined ? {} : { projectId: settings.fcm.projectId }),
      dryRun: settings.fcm.dryRun,
    },
    email: {
      provider: 'smtp',
      from: { name: settings.from.name, address: settings.from.address },
      smtp: { ...settings.smtp },
    },
    idempotency: { store: new RedisIdempotencyStore(toRedisLike(deps.redis)) },
    logger: toSdkLogger(deps.logger),
  };
  const sdk = (deps.build ?? createNotifier)(options);
  return {
    sendPush: async (request: PushRequest): Promise<PushResult> => {
      try {
        return await sdk.sendPush(request);
      } catch (error) {
        return mapSdkError(error);
      }
    },
    sendEmail: async (request: EmailRequest): Promise<EmailResult> => {
      try {
        return await sdk.sendEmail(request);
      } catch (error) {
        return mapSdkError(error);
      }
    },
    close: () => sdk.close(),
  };
};
