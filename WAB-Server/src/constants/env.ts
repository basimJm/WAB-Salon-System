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

/** WhatsApp Cloud API identifiers (same rules as `@wab/otp`; checked at startup, not at first send). */
export const WHATSAPP_PHONE_NUMBER_ID_PATTERN = /^\d{1,32}$/;
export const WHATSAPP_TEMPLATE_NAME_PATTERN = /^[a-z0-9_]{1,512}$/;
export const WHATSAPP_API_VERSION_PATTERN = /^v\d{1,3}\.\d{1,3}$/;
/** HMAC secrets of OTP codes at rest and of `otpToken` (the SDK refuses shorter ones). */
export const OTP_SECRET_MIN_LENGTH = 32;
/** Dev-only fixed code of the fake OTP channel (digits; its length must equal `otp.length`). */
export const OTP_FIXED_CODE_PATTERN = /^\d{4,10}$/;
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
  /** WhatsApp Cloud API (Meta) phone OTP; needed when OTP_PROVIDER=whatsapp (BUSINESS_DOMAIN §3.1a). */
  whatsappPhoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
  /** System-user access token (secret). */
  whatsappAccessToken: 'WHATSAPP_ACCESS_TOKEN',
  /** Approved authentication template (same name in Arabic and English). */
  whatsappTemplateName: 'WHATSAPP_TEMPLATE_NAME',
  /** Optional Graph API version pin, e.g. `v26.0` (default: the SDK's). */
  whatsappApiVersion: 'WHATSAPP_API_VERSION',
  /** HMAC secret of codes at rest (secret, >= 32 chars). Required for whatsapp. */
  otpCodeSecret: 'OTP_CODE_SECRET',
  /** HMAC secret of `otpToken` (secret, >= 32 chars, different from OTP_CODE_SECRET). Required for whatsapp. */
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
  /** CloudFront signing for private files; all three together, or none (then S3 presigned GET is used). */
  cloudfrontBaseUrl: 'CLOUDFRONT_PRIVATE_BASE_URL',
  cloudfrontKeyPairId: 'CLOUDFRONT_KEY_PAIR_ID',
  cloudfrontPrivateKey: 'CLOUDFRONT_PRIVATE_KEY',
} as const;

/**
 * Keys that pick `fake` or `real` for an external provider; production must set them to `real`.
 * Payments (`fake` | `disabled`) and OTP (`fake` | `whatsapp`) have their own production rules.
 */
export const PROVIDER_ENV_KEYS = [ENV_KEYS.storageProvider, ENV_KEYS.notifierProvider] as const;

/** Keys that must be present when the OTP provider is `whatsapp`. */
export const OTP_WHATSAPP_REQUIRED_KEYS = [
  ENV_KEYS.whatsappPhoneNumberId,
  ENV_KEYS.whatsappAccessToken,
  ENV_KEYS.whatsappTemplateName,
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
export const CLOUDFRONT_KEYS = [
  ENV_KEYS.cloudfrontBaseUrl,
  ENV_KEYS.cloudfrontKeyPairId,
  ENV_KEYS.cloudfrontPrivateKey,
] as const;
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_EMAIL_FROM_NAME = 'WAB';
