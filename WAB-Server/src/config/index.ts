import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import {
  DEFAULT_ENVIRONMENT,
  ENVIRONMENTS,
  ENV_KEYS,
  envFileName,
  type Environment,
  type LogLevel,
} from '../constants/env';
import { DEFAULT_PROVIDER_MODE, type ProviderMode } from '../constants/providers';
import { envSchema } from './env.schema';

export interface AppConfig {
  readonly env: Environment;
  readonly isProduction: boolean;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly corsAllowedOrigins: readonly string[];
  /** Number of reverse proxies in front of the app (load balancer = 1); 0 = trust none. */
  readonly trustProxyHops: number;
  readonly mongo: { readonly uri: string };
  readonly redis: { readonly url: string };
  readonly auth: { readonly accessSecret: string };
  /** Encryption keys for fields at rest; absent keys switch the dependent features off. */
  readonly secrets: { readonly payoutEncryptionKey?: string };
  /** `fake` = in-repo stand-in (dev/test only), `real` = the production integration. */
  readonly providers: {
    readonly otp: ProviderMode;
    readonly storage: ProviderMode;
    readonly notifier: ProviderMode;
    readonly payments: ProviderMode;
    readonly analytics: ProviderMode;
  };
}

/** Thrown at startup when the environment is invalid. Names the bad keys, never their values. */
export class ConfigError extends Error {
  readonly invalidKeys: readonly string[];

  constructor(invalidKeys: readonly string[]) {
    super(`Invalid environment configuration: ${invalidKeys.join(', ')}`);
    this.name = 'ConfigError';
    this.invalidKeys = invalidKeys;
  }
}

const isEnvironment = (value: string | undefined): value is Environment =>
  ENVIRONMENTS.some((environment) => environment === value);

/**
 * Merges `.env.<NODE_ENV>` (if present) under the real process environment.
 * Real environment variables always win, so hosts and CI can override files.
 */
export const readEnvSources = (
  processEnv: NodeJS.ProcessEnv = process.env,
  directory: string = process.cwd(),
): NodeJS.ProcessEnv => {
  const requested = processEnv[ENV_KEYS.nodeEnv];
  const environment = isEnvironment(requested) ? requested : DEFAULT_ENVIRONMENT;
  const filePath = join(directory, envFileName(environment));
  const fromFile = existsSync(filePath) ? parseEnv(readFileSync(filePath, 'utf8')) : {};
  return { ...fromFile, ...processEnv };
};

/** Validates the environment and returns an immutable, typed config. Fails fast. */
export const loadConfig = (source: NodeJS.ProcessEnv = readEnvSources()): AppConfig => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const keys = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    throw new ConfigError([...keys]);
  }
  const values = parsed.data;
  const env = values[ENV_KEYS.nodeEnv];
  const payoutKey = values[ENV_KEYS.payoutEncryptionKey];
  return Object.freeze({
    env,
    isProduction: env === 'production',
    port: values[ENV_KEYS.port],
    logLevel: values[ENV_KEYS.logLevel],
    corsAllowedOrigins: Object.freeze(values[ENV_KEYS.corsAllowedOrigins]),
    trustProxyHops: values[ENV_KEYS.trustProxyHops],
    mongo: Object.freeze({ uri: values[ENV_KEYS.mongoUri] }),
    redis: Object.freeze({ url: values[ENV_KEYS.redisUrl] }),
    auth: Object.freeze({ accessSecret: values[ENV_KEYS.jwtAccessSecret] }),
    secrets: Object.freeze(payoutKey === undefined ? {} : { payoutEncryptionKey: payoutKey }),
    providers: Object.freeze({
      otp: values[ENV_KEYS.otpProvider] ?? DEFAULT_PROVIDER_MODE,
      storage: values[ENV_KEYS.storageProvider] ?? DEFAULT_PROVIDER_MODE,
      notifier: values[ENV_KEYS.notifierProvider] ?? DEFAULT_PROVIDER_MODE,
      payments: values[ENV_KEYS.paymentProvider] ?? DEFAULT_PROVIDER_MODE,
      analytics: values[ENV_KEYS.analyticsProvider] ?? DEFAULT_PROVIDER_MODE,
    }),
  });
};
