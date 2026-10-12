import { z } from 'zod';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PORT,
  ENVIRONMENTS,
  ENV_KEYS,
  LIST_SEPARATOR,
  LOG_LEVELS,
  MONGO_URI_PATTERN,
  PORT_MAX,
  PORT_MIN,
  REDIS_URL_PATTERN,
} from '../constants/env';

const splitList = (value: string): string[] =>
  value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** Raw environment variables → validated, typed values. Secrets have no defaults. */
export const envSchema = z.object({
  [ENV_KEYS.nodeEnv]: z.enum(ENVIRONMENTS).default(DEFAULT_ENVIRONMENT),
  [ENV_KEYS.port]: z.coerce.number().int().min(PORT_MIN).max(PORT_MAX).default(DEFAULT_PORT),
  [ENV_KEYS.logLevel]: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  [ENV_KEYS.corsAllowedOrigins]: z.string().default('').transform(splitList),
  [ENV_KEYS.mongoUri]: z.string().regex(MONGO_URI_PATTERN),
  [ENV_KEYS.redisUrl]: z.string().regex(REDIS_URL_PATTERN),
});

export type RawEnv = z.infer<typeof envSchema>;
