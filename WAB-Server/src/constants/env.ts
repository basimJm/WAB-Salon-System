/** Environment-variable names and static rules for the config loader (SRV-002). */
export const ENVIRONMENTS = ['development', 'production', 'test'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const DEFAULT_ENVIRONMENT: Environment = 'development';
export const DEFAULT_PORT = 3000;
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

export const PORT_MIN = 1;
export const PORT_MAX = 65535;

export const MONGO_URI_PATTERN = /^mongodb(\+srv)?:\/\/\S+$/;
export const REDIS_URL_PATTERN = /^rediss?:\/\/\S+$/;

export const LIST_SEPARATOR = ',';

/** Per-environment dotenv file name, e.g. `.env.development` (never committed). */
export const envFileName = (environment: Environment): string => `.env.${environment}`;

export const ENV_KEYS = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  logLevel: 'LOG_LEVEL',
  corsAllowedOrigins: 'CORS_ALLOWED_ORIGINS',
  trustProxyHops: 'TRUST_PROXY_HOPS',
  mongoUri: 'MONGODB_URI',
  redisUrl: 'REDIS_URL',
  jwtAccessSecret: 'JWT_ACCESS_SECRET',
  /** Base64 of 32 random bytes: encrypts salon bank details at rest (AES-256-GCM). */
  payoutEncryptionKey: 'PAYOUT_ENCRYPTION_KEY',
  otpProvider: 'OTP_PROVIDER',
  storageProvider: 'STORAGE_PROVIDER',
  notifierProvider: 'NOTIFIER_PROVIDER',
  paymentProvider: 'PAYMENT_PROVIDER',
  analyticsProvider: 'ANALYTICS_PROVIDER',
  /** Firebase service-account key as JSON text (secret). Needed when NOTIFIER_PROVIDER=real. */
  fcmServiceAccountJson: 'FCM_SERVICE_ACCOUNT_JSON',
  /** Optional: must equal the key's project (catches dev/prod key mix-ups). */
  fcmProjectId: 'FCM_PROJECT_ID',
  /** `true` validates pushes without delivering them (dev only). */
  fcmDryRun: 'FCM_DRY_RUN',
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpSecure: 'SMTP_SECURE',
  smtpUser: 'SMTP_USER',
  /** Google App Password (secret). */
  smtpPass: 'SMTP_PASS',
  emailFromAddress: 'EMAIL_FROM_ADDRESS',
  emailFromName: 'EMAIL_FROM_NAME',
  /** BigQuery project/dataset of the Firebase Analytics export (ANALYTICS_PROVIDER=real). */
  analyticsBigqueryProjectId: 'ANALYTICS_BIGQUERY_PROJECT_ID',
  analyticsBigqueryDataset: 'ANALYTICS_BIGQUERY_DATASET',
  analyticsBigqueryLocation: 'ANALYTICS_BIGQUERY_LOCATION',
  /** Service-account key as JSON text (secret). */
  analyticsBigqueryCredentialsJson: 'ANALYTICS_BIGQUERY_CREDENTIALS_JSON',
  /** Crashlytics export table (optional). */
  analyticsBigqueryCrashTable: 'ANALYTICS_BIGQUERY_CRASH_TABLE',
  /** Cost guard: most bytes one query may bill. */
  analyticsBigqueryMaxBytesBilled: 'ANALYTICS_BIGQUERY_MAX_BYTES_BILLED',
} as const;

/** Keys that pick `fake` or `real` for an external provider; production must set them to `real`. */
export const PROVIDER_ENV_KEYS = [
  ENV_KEYS.otpProvider,
  ENV_KEYS.storageProvider,
  ENV_KEYS.notifierProvider,
  ENV_KEYS.paymentProvider,
  ENV_KEYS.analyticsProvider,
] as const;

/** Keys that must be present when the notifier provider is `real`. */
export const NOTIFIER_REAL_REQUIRED_KEYS = [
  ENV_KEYS.fcmServiceAccountJson,
  ENV_KEYS.smtpHost,
  ENV_KEYS.emailFromAddress,
] as const;
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_EMAIL_FROM_NAME = 'WAB';

/** Keys production needs when the analytics provider is `real` (BigQuery is part of production). */
export const ANALYTICS_PRODUCTION_REQUIRED_KEYS = [
  ENV_KEYS.analyticsBigqueryProjectId,
  ENV_KEYS.analyticsBigqueryDataset,
  ENV_KEYS.analyticsBigqueryCredentialsJson,
] as const;
