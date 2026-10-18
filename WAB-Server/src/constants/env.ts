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

/** `host:port` of the Firebase Auth emulator. */
export const FIREBASE_EMULATOR_HOST_PATTERN = /^[A-Za-z0-9.-]+:\d{1,5}$/;
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
  /** Firebase project whose Phone Auth ID tokens are accepted (dev and prod use different projects). Needed when OTP_PROVIDER=real. */
  firebaseProjectId: 'FIREBASE_PROJECT_ID',
  /** Dev only: Firebase Auth emulator `host:port`; refused in production. */
  firebaseAuthEmulatorHost: 'FIREBASE_AUTH_EMULATOR_HOST',
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
  /** `hyperpay` (default) or `mock-gateway` (dev only: the local OPP mock). Used when PAYMENT_PROVIDER=real. */
  paymentGateway: 'PAYMENT_GATEWAY',
  /** Optional: defaults to the HyperPay test host outside production and the live host in production. Required for `mock-gateway`. */
  hyperpayBaseUrl: 'HYPERPAY_BASE_URL',
  hyperpayEntityId: 'HYPERPAY_ENTITY_ID',
  /** HyperPay bearer token (secret). */
  hyperpayAccess: 'HYPERPAY_ACCESS_TOKEN',
  /** 64 hex characters from the HyperPay portal that decrypt notifications (secret). Required in production. */
  hyperpayWebhookKey: 'HYPERPAY_WEBHOOK_KEY',
  /** Where the checkout returns the shopper: the customer app's scheme or an https URL. */
  hyperpayReturnUrl: 'HYPERPAY_RETURN_URL',
  /** Sandbox switch (`EXTERNAL` | `INTERNAL`); refused in production. */
  hyperpayTestMode: 'HYPERPAY_TEST_MODE',
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
  /** S3 (or S3-compatible) storage; needed when STORAGE_PROVIDER=real. */
  s3Region: 'S3_REGION',
  s3PublicBucket: 'S3_PUBLIC_BUCKET',
  s3PrivateBucket: 'S3_PRIVATE_BUCKET',
  /** Dev only: MinIO or another emulator. Unset for AWS. */
  s3Endpoint: 'S3_ENDPOINT',
  s3ForcePathStyle: 'S3_FORCE_PATH_STYLE',
  /** Unset = the platform's IAM role / default credential chain. */
  s3AccessKeyId: 'S3_ACCESS_KEY_ID',
  s3SecretAccessKey: 'S3_SECRET_ACCESS_KEY',
  /** Public media base URL (the CDN domain). */
  cdnBaseUrl: 'CDN_BASE_URL',
  /** CloudFront signing for private files; all three together, or none (then S3 presigned GET is used). */
  cloudfrontBaseUrl: 'CLOUDFRONT_PRIVATE_BASE_URL',
  cloudfrontKeyPairId: 'CLOUDFRONT_KEY_PAIR_ID',
  cloudfrontPrivateKey: 'CLOUDFRONT_PRIVATE_KEY',
} as const;

/** Keys that pick `fake` or `real` for an external provider; production must set them to `real`. */
export const PROVIDER_ENV_KEYS = [
  ENV_KEYS.otpProvider,
  ENV_KEYS.storageProvider,
  ENV_KEYS.notifierProvider,
  ENV_KEYS.paymentProvider,
  ENV_KEYS.analyticsProvider,
] as const;

/** Keys that must be present when the OTP provider is `real`. */
export const OTP_REAL_REQUIRED_KEYS = [ENV_KEYS.firebaseProjectId] as const;

/** Keys that must be present when the notifier provider is `real`. */
export const NOTIFIER_REAL_REQUIRED_KEYS = [
  ENV_KEYS.fcmServiceAccountJson,
  ENV_KEYS.smtpHost,
  ENV_KEYS.emailFromAddress,
] as const;
/** Keys that must be present when the storage provider is `real`. */
export const STORAGE_REAL_REQUIRED_KEYS = [
  ENV_KEYS.s3Region,
  ENV_KEYS.s3PublicBucket,
  ENV_KEYS.s3PrivateBucket,
  ENV_KEYS.cdnBaseUrl,
] as const;
export const CLOUDFRONT_KEYS = [
  ENV_KEYS.cloudfrontBaseUrl,
  ENV_KEYS.cloudfrontKeyPairId,
  ENV_KEYS.cloudfrontPrivateKey,
] as const;
/** Keys that must be present when the payment provider is `real`. */
export const PAYMENT_REAL_REQUIRED_KEYS = [
  ENV_KEYS.hyperpayEntityId,
  ENV_KEYS.hyperpayAccess,
  ENV_KEYS.hyperpayReturnUrl,
] as const;
export const PAYMENT_GATEWAYS = ['hyperpay', 'mock-gateway'] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];
export const DEFAULT_PAYMENT_GATEWAY: PaymentGateway = 'hyperpay';
export const HYPERPAY_TEST_MODES = ['EXTERNAL', 'INTERNAL'] as const;
export const HYPERPAY_WEBHOOK_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_EMAIL_FROM_NAME = 'WAB';

/** Keys production needs when the analytics provider is `real` (BigQuery is part of production). */
export const ANALYTICS_PRODUCTION_REQUIRED_KEYS = [
  ENV_KEYS.analyticsBigqueryProjectId,
  ENV_KEYS.analyticsBigqueryDataset,
  ENV_KEYS.analyticsBigqueryCredentialsJson,
] as const;
