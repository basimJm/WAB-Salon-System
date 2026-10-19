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

/** Keys that pick `fake` or `real` for an external provider; production must set them to `real`. Payments are paused: PAYMENT_PROVIDER is `fake` or `disabled` and has its own production rule. */
export const PROVIDER_ENV_KEYS = [
  ENV_KEYS.otpProvider,
  ENV_KEYS.storageProvider,
  ENV_KEYS.notifierProvider,
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
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_EMAIL_FROM_NAME = 'WAB';
