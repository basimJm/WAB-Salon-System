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
import { envSchema, type RawEnv } from './env.schema';

export interface NotifierSettings {
  readonly fcm: {
    readonly serviceAccountJson: string;
    readonly projectId?: string;
    readonly dryRun: boolean;
  };
  readonly smtp: {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly user?: string;
    readonly pass?: string;
  };
  readonly from: { readonly address: string; readonly name: string };
}

/** Firebase settings of the real OTP provider (wab-otp). */
export interface OtpSettings {
  readonly firebase: {
    readonly projectId: string;
    readonly authEmulatorHost?: string;
  };
}

export interface StorageSettings {
  readonly region: string;
  readonly publicBucket: string;
  readonly privateBucket: string;
  readonly endpoint?: string;
  readonly forcePathStyle: boolean;
  readonly credentials?: { readonly accessKeyId: string; readonly secretAccessKey: string };
  readonly cdnBaseUrl: string;
  readonly cloudfront?: {
    readonly baseUrl: string;
    readonly keyPairId: string;
    readonly privateKey: string;
  };
}

/** BigQuery export of Firebase Analytics / Crashlytics (analytics provider `real`). */
export interface AnalyticsSettings {
  readonly bigquery?: {
    readonly projectId: string;
    readonly dataset: string;
    readonly location?: string;
    /** Service-account key as JSON text (secret). */
    readonly credentialsJson?: string;
    readonly crashTable?: string;
    readonly maxBytesBilled?: number;
  };
}

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
  /** Credentials of the real notifier (FCM + SMTP); present only when the notifier is `real`. */
  readonly notifier?: NotifierSettings;
  /** Settings of the real analytics provider; present only when it is `real`. */
  readonly analytics?: AnalyticsSettings;
  /** S3 + CDN settings of the real storage; present only when the storage is `real`. */
  readonly storage?: StorageSettings;
  /** Firebase project of the real OTP provider; present only when the OTP provider is `real`. */
  readonly otp?: OtpSettings;
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

const buildNotifierSettings = (values: RawEnv): NotifierSettings | undefined => {
  if (values[ENV_KEYS.notifierProvider] !== 'real') return undefined;
  const json = values[ENV_KEYS.fcmServiceAccountJson];
  const host = values[ENV_KEYS.smtpHost];
  const address = values[ENV_KEYS.emailFromAddress];
  if (json === undefined || host === undefined || address === undefined) return undefined;
  const projectId = values[ENV_KEYS.fcmProjectId];
  const user = values[ENV_KEYS.smtpUser];
  const pass = values[ENV_KEYS.smtpPass];
  return Object.freeze({
    fcm: Object.freeze({
      serviceAccountJson: json,
      ...(projectId === undefined ? {} : { projectId }),
      dryRun: values[ENV_KEYS.fcmDryRun],
    }),
    smtp: Object.freeze({
      host,
      port: values[ENV_KEYS.smtpPort],
      secure: values[ENV_KEYS.smtpSecure],
      ...(user === undefined || pass === undefined ? {} : { user, pass }),
    }),
    from: Object.freeze({ address, name: values[ENV_KEYS.emailFromName] }),
  });
};

const buildOtpSettings = (values: RawEnv): OtpSettings | undefined => {
  if (values[ENV_KEYS.otpProvider] !== 'real') return undefined;
  const projectId = values[ENV_KEYS.firebaseProjectId];
  if (projectId === undefined) return undefined;
  const emulatorHost = values[ENV_KEYS.firebaseAuthEmulatorHost];
  return Object.freeze({
    firebase: Object.freeze({
      projectId,
      ...(emulatorHost === undefined ? {} : { authEmulatorHost: emulatorHost }),
    }),
  });
};

const buildStorageSettings = (values: RawEnv): StorageSettings | undefined => {
  if (values[ENV_KEYS.storageProvider] !== 'real') return undefined;
  const region = values[ENV_KEYS.s3Region];
  const publicBucket = values[ENV_KEYS.s3PublicBucket];
  const privateBucket = values[ENV_KEYS.s3PrivateBucket];
  const cdnBaseUrl = values[ENV_KEYS.cdnBaseUrl];
  if (
    region === undefined ||
    publicBucket === undefined ||
    privateBucket === undefined ||
    cdnBaseUrl === undefined
  )
    return undefined;
  const endpoint = values[ENV_KEYS.s3Endpoint];
  const accessKeyId = values[ENV_KEYS.s3AccessKeyId];
  const secretAccessKey = values[ENV_KEYS.s3SecretAccessKey];
  const baseUrl = values[ENV_KEYS.cloudfrontBaseUrl];
  const keyPairId = values[ENV_KEYS.cloudfrontKeyPairId];
  const privateKey = values[ENV_KEYS.cloudfrontPrivateKey];
  return Object.freeze({
    region,
    publicBucket,
    privateBucket,
    ...(endpoint === undefined ? {} : { endpoint }),
    forcePathStyle: values[ENV_KEYS.s3ForcePathStyle],
    ...(accessKeyId === undefined || secretAccessKey === undefined
      ? {}
      : { credentials: Object.freeze({ accessKeyId, secretAccessKey }) }),
    cdnBaseUrl,
    ...(baseUrl === undefined || keyPairId === undefined || privateKey === undefined
      ? {}
      : { cloudfront: Object.freeze({ baseUrl, keyPairId, privateKey }) }),
  });
};

const buildAnalyticsSettings = (values: RawEnv): AnalyticsSettings | undefined => {
  if (values[ENV_KEYS.analyticsProvider] !== 'real') return undefined;
  const projectId = values[ENV_KEYS.analyticsBigqueryProjectId];
  const dataset = values[ENV_KEYS.analyticsBigqueryDataset];
  if (projectId === undefined || dataset === undefined) return Object.freeze({});
  const location = values[ENV_KEYS.analyticsBigqueryLocation];
  const credentialsJson = values[ENV_KEYS.analyticsBigqueryCredentialsJson];
  const crashTable = values[ENV_KEYS.analyticsBigqueryCrashTable];
  const maxBytesBilled = values[ENV_KEYS.analyticsBigqueryMaxBytesBilled];
  return Object.freeze({
    bigquery: Object.freeze({
      projectId,
      dataset,
      ...(location === undefined ? {} : { location }),
      ...(credentialsJson === undefined ? {} : { credentialsJson }),
      ...(crashTable === undefined ? {} : { crashTable }),
      ...(maxBytesBilled === undefined ? {} : { maxBytesBilled }),
    }),
  });
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
  const notifier = buildNotifierSettings(values);
  const analytics = buildAnalyticsSettings(values);
  const storage = buildStorageSettings(values);
  const otp = buildOtpSettings(values);
  return Object.freeze({
    ...(notifier === undefined ? {} : { notifier }),
    ...(analytics === undefined ? {} : { analytics }),
    ...(storage === undefined ? {} : { storage }),
    ...(otp === undefined ? {} : { otp }),
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
