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

/** ARQAM OTP template and sender names (same rules as `@wab/otp`; checked at startup, not at first send). */
export const ARQAM_TEMPLATE_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,512}$/;
export const ARQAM_SENDER_ID_PATTERN = /^[A-Za-z0-9_.:+-]{1,128}$/;
/** HMAC secrets of OTP codes at rest and of `otpToken` (the SDK refuses shorter ones). */
export const OTP_SECRET_MIN_LENGTH = 32;
/** Dev-only fixed code of the fake OTP channel (digits; its length must equal `otp.length`). */
export const OTP_FIXED_CODE_PATTERN = /^\d{4,10}$/;
export const MONGO_URI_PATTERN = /^mongodb(\+srv)?:\/\/\S+$/;
export const REDIS_URL_PATTERN = /^rediss?:\/\/\S+$/;
/** A MongoDB database name (letters, digits, `_`, `-`; Atlas allows up to 63 bytes). */
export const MONGO_DATABASE_NAME_PATTERN = /^[A-Za-z0-9_-]{1,63}$/;

export const LIST_SEPARATOR = ',';
/** Production URLs of external APIs must use TLS. */
export const HTTPS_URL_PREFIX = 'https://';

/** Per-environment dotenv file name, e.g. `.env.development` (never committed). */
export const envFileName = (environment: Environment): string => `.env.${environment}`;

export const ENV_KEYS = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  logLevel: 'LOG_LEVEL',
  corsAllowedOrigins: 'CORS_ALLOWED_ORIGINS',
  trustProxyHops: 'TRUST_PROXY_HOPS',
  /** App Links / Universal Links (comma lists; empty = no app claims the links). */
  appLinksAndroidPackages: 'APP_LINKS_ANDROID_PACKAGES',
  appLinksAndroidSha256: 'APP_LINKS_ANDROID_SHA256',
  appLinksIosAppIds: 'APP_LINKS_IOS_APP_IDS',
  appLinksPlayStoreUrl: 'APP_LINKS_PLAY_STORE_URL',
  appLinksAppStoreUrl: 'APP_LINKS_APP_STORE_URL',
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
  /** ARQAM OTP project API key (secret; TEST key in dev, LIVE key in production). Needed when OTP_PROVIDER=arqam. */
  arqamApiKey: 'ARQAM_API_KEY',
  /** Optional API base URL (default: the SDK's `https://otp.arqam.tech/api`; https in production). */
  arqamBaseUrl: 'ARQAM_BASE_URL',
  /** ARQAM authentication template for Arabic requests (`Accept-Language: ar`). */
  arqamTemplateAr: 'ARQAM_TEMPLATE_AR',
  /** ARQAM authentication template for English requests. */
  arqamTemplateEn: 'ARQAM_TEMPLATE_EN',
  /** Optional approved sender id (only when the account has several senders). */
  arqamSenderId: 'ARQAM_SENDER_ID',
  /** `true` passes the end user's IP (trust-proxy aware) when the ARQAM project limits per IP. */
  arqamSendIp: 'ARQAM_SEND_IP',
  /** HMAC secret of codes at rest (secret, >= 32 chars). Required for arqam. */
  otpCodeSecret: 'OTP_CODE_SECRET',
  /** HMAC secret of `otpToken` (secret, >= 32 chars, different from OTP_CODE_SECRET). Required for arqam. */
  otpProofSecret: 'OTP_PROOF_SECRET',
  /** Development only: every OTP code is this value (local QA sign-in); refused in production. */
  otpFixedCode: 'OTP_FIXED_CODE',
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
  /**
   * Cloudflare R2 (STORAGE_PROVIDER=cloudflare-r2, SRV-180). R2 public access is per bucket, so public
   * media and private documents live in two buckets; the private one never gets public access.
   */
  r2AccountId: 'R2_ACCOUNT_ID',
  r2AccessKeyId: 'R2_ACCESS_KEY_ID',
  r2SecretAccessKey: 'R2_SECRET_ACCESS_KEY',
  r2PublicBucketName: 'R2_PUBLIC_BUCKET_NAME',
  r2PrivateBucketName: 'R2_PRIVATE_BUCKET_NAME',
  /** Optional: unset = `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` (set it for a jurisdiction endpoint). */
  r2Endpoint: 'R2_ENDPOINT',
  /** Public base URL of the public bucket (custom domain or r2.dev); https in production. */
  r2PublicUrl: 'R2_PUBLIC_URL',
  /** CloudFront signing for private files; all three together, or none (then S3 presigned GET is used). */
  cloudfrontBaseUrl: 'CLOUDFRONT_PRIVATE_BASE_URL',
  cloudfrontKeyPairId: 'CLOUDFRONT_KEY_PAIR_ID',
  cloudfrontPrivateKey: 'CLOUDFRONT_PRIVATE_KEY',
  /** `true` loads the idempotent demo seed after startup (development data only, SRV-160). */
  seedDemoOnStart: 'SEED_DEMO_ON_START',
  /**
   * Under `NODE_ENV=production` (the hosted dev service runs it) the demo seed runs only when this
   * names the database the server is connected to; the real production database must never be named.
   */
  seedDemoDatabase: 'SEED_DEMO_DATABASE',
} as const;

/**
 * Keys that pick `fake` or `real` for an external provider; production must set them to `real`.
 * Storage (`real` | `cloudflare-r2`), payments (`fake` | `disabled`) and OTP (`fake` | `arqam`) have
 * their own production rules.
 */
export const PROVIDER_ENV_KEYS = [ENV_KEYS.notifierProvider] as const;

/** Keys that must be present when the OTP provider is `arqam`. */
export const OTP_ARQAM_REQUIRED_KEYS = [
  ENV_KEYS.arqamApiKey,
  ENV_KEYS.arqamTemplateAr,
  ENV_KEYS.arqamTemplateEn,
  ENV_KEYS.otpCodeSecret,
  ENV_KEYS.otpProofSecret,
] as const;

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
/** Keys that must be present when the storage provider is `cloudflare-r2` (R2 has no instance roles). */
export const STORAGE_R2_REQUIRED_KEYS = [
  ENV_KEYS.r2AccountId,
  ENV_KEYS.r2AccessKeyId,
  ENV_KEYS.r2SecretAccessKey,
  ENV_KEYS.r2PublicBucketName,
  ENV_KEYS.r2PrivateBucketName,
  ENV_KEYS.r2PublicUrl,
] as const;
export const CLOUDFRONT_KEYS = [
  ENV_KEYS.cloudfrontBaseUrl,
  ENV_KEYS.cloudfrontKeyPairId,
  ENV_KEYS.cloudfrontPrivateKey,
] as const;
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_EMAIL_FROM_NAME = 'WAB';
