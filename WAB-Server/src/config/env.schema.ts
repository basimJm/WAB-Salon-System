import { z } from 'zod';
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PORT,
  ENVIRONMENTS,
  ENV_KEYS,
  PROVIDER_ENV_KEYS,
  LIST_SEPARATOR,
  LOG_LEVELS,
  MONGO_URI_PATTERN,
  PORT_MAX,
  PORT_MIN,
  REDIS_URL_PATTERN,
} from '../constants/env';
import { JWT_SECRET_MIN_LENGTH } from '../constants/auth';
import { PROVIDER_MODES, REAL_PROVIDER_MODE } from '../constants/providers';
import {
  DEFAULT_TRUST_PROXY_HOPS,
  TRUST_PROXY_HOPS_MAX,
  TRUST_PROXY_HOPS_MIN,
} from '../constants/security';

const splitList = (value: string): string[] =>
  value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** Raw environment variables → validated, typed values. Secrets have no defaults. */
const providerMode = z.enum(PROVIDER_MODES).optional();

export const envSchema = z
  .object({
    [ENV_KEYS.nodeEnv]: z.enum(ENVIRONMENTS).default(DEFAULT_ENVIRONMENT),
    [ENV_KEYS.port]: z.coerce.number().int().min(PORT_MIN).max(PORT_MAX).default(DEFAULT_PORT),
    [ENV_KEYS.logLevel]: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
    [ENV_KEYS.corsAllowedOrigins]: z.string().default('').transform(splitList),
    [ENV_KEYS.trustProxyHops]: z.coerce
      .number()
      .int()
      .min(TRUST_PROXY_HOPS_MIN)
      .max(TRUST_PROXY_HOPS_MAX)
      .default(DEFAULT_TRUST_PROXY_HOPS),
    [ENV_KEYS.mongoUri]: z.string().regex(MONGO_URI_PATTERN),
    [ENV_KEYS.redisUrl]: z.string().regex(REDIS_URL_PATTERN),
    // Signs access tokens: a secret with no default, long enough for HS256.
    [ENV_KEYS.jwtAccessSecret]: z.string().min(JWT_SECRET_MIN_LENGTH),
    [ENV_KEYS.otpProvider]: providerMode,
    [ENV_KEYS.storageProvider]: providerMode,
    [ENV_KEYS.notifierProvider]: providerMode,
    [ENV_KEYS.paymentProvider]: providerMode,
    [ENV_KEYS.analyticsProvider]: providerMode,
  })
  // Production never runs on fakes, and never guesses: every provider must be named `real`.
  .superRefine((env, context) => {
    if (env[ENV_KEYS.nodeEnv] !== 'production') return;
    for (const key of PROVIDER_ENV_KEYS) {
      if (env[key] !== REAL_PROVIDER_MODE)
        context.addIssue({ code: 'custom', path: [key], message: key });
    }
  });

export type RawEnv = z.infer<typeof envSchema>;
