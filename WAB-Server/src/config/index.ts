import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import type { AppLinksSettings } from '../constants/appLinks';
import { ENV_KEY_HINTS } from '../constants/envHints';
import {
  DEFAULT_ENVIRONMENT,
  ENVIRONMENTS,
  ENV_KEYS,
  envFileName,
  type Environment,
  type LogLevel,
} from '../constants/env';
import {
  DEFAULT_OTP_PROVIDER_MODE,
  DEFAULT_PAYMENT_PROVIDER_MODE,
  DEFAULT_PROVIDER_MODE,
  WHATSAPP_OTP_MODE,
  type OtpProviderMode,
  type PaymentProviderMode,
  type ProviderMode,
} from '../constants/providers';
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

/** WhatsApp Cloud API account of the `whatsapp` OTP provider (BUSINESS_DOMAIN §3.1a). */
export interface WhatsAppSettings {
  readonly phoneNumberId: string;
  readonly accessToken: string;
  readonly templateName: string;
  readonly apiVersion?: string;
}

/**
 * Phone OTP secrets and channel (wab-otp). `whatsapp` is present only for OTP_PROVIDER=whatsapp,
 * which also requires both secrets; the fake provider makes per-process secrets when they are unset.
 */
export interface OtpSettings {
  readonly codeSecret?: string;
  readonly proofSecret?: string;
  /** Development only: every code is this value (refused in production). */
  readonly fixedCode?: string;
  readonly whatsapp?: WhatsAppSettings;
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

/** Lists default to empty; a store URL is left out when unset (the page then hides its button). */
const buildAppLinksSettings = (values: RawEnv): AppLinksSettings => {
  const playStoreUrl = values[ENV_KEYS.appLinksPlayStoreUrl];
  const appStoreUrl = values[ENV_KEYS.appLinksAppStoreUrl];
  return Object.freeze({
    androidPackages: Object.freeze(values[ENV_KEYS.appLinksAndroidPackages]),
    androidSha256: Object.freeze(values[ENV_KEYS.appLinksAndroidSha256]),
    iosAppIds: Object.freeze(values[ENV_KEYS.appLinksIosAppIds]),
    ...(playStoreUrl === undefined ? {} : { playStoreUrl }),
    ...(appStoreUrl === undefined ? {} : { appStoreUrl }),
  });
};

export interface AppConfig {
  readonly env: Environment;
  readonly isProduction: boolean;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly corsAllowedOrigins: readonly string[];
  /** Android App Links + iOS Universal Links for shared salon links. */
  readonly appLinks: AppLinksSettings;
  /** Number of reverse proxies in front of the app (load balancer = 1); 0 = trust none. */
  readonly trustProxyHops: number;
  readonly mongo: { readonly uri: string };
  readonly redis: { readonly url: string };
  readonly auth: { readonly accessSecret: string };
  /** Encryption keys for fields at rest; absent keys switch the dependent features off. */
  readonly secrets: { readonly payoutEncryptionKey?: string };
  /** Credentials of the real notifier (FCM + SMTP); present only when the notifier is `real`. */
  readonly notifier?: NotifierSettings;
  /** S3 + CDN settings of the real storage; present only when the storage is `real`. */
  readonly storage?: StorageSettings;
  /** Phone OTP secrets and WhatsApp account. */
  readonly otp: OtpSettings;
  /** `fake` = in-repo stand-in (dev/test only), `real` = the production integration. */
  readonly providers: {
    /** `whatsapp` in production; `fake` records codes instead of sending them. */
    readonly otp: OtpProviderMode;
    readonly storage: ProviderMode;
    readonly notifier: ProviderMode;
    /** Payments are paused: `fake` in dev/test, `disabled` in production. */
    readonly payments: PaymentProviderMode;
  };
}

/** One invalid environment key and why. Never carries the value. */
export interface ConfigProblem {
  readonly key: string;
  readonly reason: string;
}

const PROBLEM_MISSING = 'is not set';
const PROBLEM_EMPTY = 'is set but empty';
const PROBLEM_INVALID = 'has an invalid value';

const describeProblem = (key: string, source: NodeJS.ProcessEnv): ConfigProblem => {
  const raw = source[key];
  const state =
    raw === undefined ? PROBLEM_MISSING : raw.trim() === '' ? PROBLEM_EMPTY : PROBLEM_INVALID;
  const hint = ENV_KEY_HINTS[key];
  return { key, reason: hint === undefined ? state : `${state}; ${hint}` };
};

/**
 * Thrown at startup when the environment is invalid. Names every bad key and why (missing, empty
 * or invalid, with what a valid value looks like), never the values.
 */
export class ConfigError extends Error {
  readonly invalidKeys: readonly string[];
  readonly problems: readonly ConfigProblem[];

  constructor(problems: readonly ConfigProblem[]) {
    super(
      [
        `Invalid environment configuration: ${String(problems.length)} problem(s). Fix them in the host's environment settings and redeploy:`,
        ...problems.map((problem) => `  - ${problem.key} ${problem.reason}`),
      ].join('\n'),
    );
    this.name = 'ConfigError';
    this.problems = problems;
    this.invalidKeys = problems.map((problem) => problem.key);
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

const buildWhatsAppSettings = (values: RawEnv): WhatsAppSettings | undefined => {
  if (values[ENV_KEYS.otpProvider] !== WHATSAPP_OTP_MODE) return undefined;
  const phoneNumberId = values[ENV_KEYS.whatsappPhoneNumberId];
  const accessToken = values[ENV_KEYS.whatsappAccessToken];
  const templateName = values[ENV_KEYS.whatsappTemplateName];
  if (phoneNumberId === undefined || accessToken === undefined || templateName === undefined)
    return undefined;
  const apiVersion = values[ENV_KEYS.whatsappApiVersion];
  return Object.freeze({
    phoneNumberId,
    accessToken,
    templateName,
    ...(apiVersion === undefined ? {} : { apiVersion }),
  });
};

const buildOtpSettings = (values: RawEnv): OtpSettings => {
  const codeSecret = values[ENV_KEYS.otpCodeSecret];
  const proofSecret = values[ENV_KEYS.otpProofSecret];
  const fixedCode = values[ENV_KEYS.otpFixedCode];
  const whatsapp = buildWhatsAppSettings(values);
  return Object.freeze({
    ...(codeSecret === undefined ? {} : { codeSecret }),
    ...(proofSecret === undefined ? {} : { proofSecret }),
    ...(fixedCode === undefined ? {} : { fixedCode }),
    ...(whatsapp === undefined ? {} : { whatsapp }),
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

/** Validates the environment and returns an immutable, typed config. Fails fast. */
export const loadConfig = (source: NodeJS.ProcessEnv = readEnvSources()): AppConfig => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const keys = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    throw new ConfigError([...keys].map((key) => describeProblem(key, source)));
  }
  const values = parsed.data;
  const env = values[ENV_KEYS.nodeEnv];
  const payoutKey = values[ENV_KEYS.payoutEncryptionKey];
  const notifier = buildNotifierSettings(values);
  const storage = buildStorageSettings(values);
  const otp = buildOtpSettings(values);
  return Object.freeze({
    ...(notifier === undefined ? {} : { notifier }),
    ...(storage === undefined ? {} : { storage }),
    otp,
    env,
    isProduction: env === 'production',
    port: values[ENV_KEYS.port],
    logLevel: values[ENV_KEYS.logLevel],
    corsAllowedOrigins: Object.freeze(values[ENV_KEYS.corsAllowedOrigins]),
    appLinks: buildAppLinksSettings(values),
    trustProxyHops: values[ENV_KEYS.trustProxyHops],
    mongo: Object.freeze({ uri: values[ENV_KEYS.mongoUri] }),
    redis: Object.freeze({ url: values[ENV_KEYS.redisUrl] }),
    auth: Object.freeze({ accessSecret: values[ENV_KEYS.jwtAccessSecret] }),
    secrets: Object.freeze(payoutKey === undefined ? {} : { payoutEncryptionKey: payoutKey }),
    providers: Object.freeze({
      otp: values[ENV_KEYS.otpProvider] ?? DEFAULT_OTP_PROVIDER_MODE,
      storage: values[ENV_KEYS.storageProvider] ?? DEFAULT_PROVIDER_MODE,
      notifier: values[ENV_KEYS.notifierProvider] ?? DEFAULT_PROVIDER_MODE,
      payments: values[ENV_KEYS.paymentProvider] ?? DEFAULT_PAYMENT_PROVIDER_MODE,
    }),
  });
};
