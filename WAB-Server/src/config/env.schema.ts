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
  DEFAULT_SMTP_PORT,
  DEFAULT_EMAIL_FROM_NAME,
  NOTIFIER_REAL_REQUIRED_KEYS,
  OTP_ARQAM_REQUIRED_KEYS,
  OTP_FIXED_CODE_PATTERN,
  OTP_SECRET_MIN_LENGTH,
  ARQAM_SENDER_ID_PATTERN,
  ARQAM_TEMPLATE_NAME_PATTERN,
  STORAGE_REAL_REQUIRED_KEYS,
  CLOUDFRONT_KEYS,
  MONGO_DATABASE_NAME_PATTERN,
  MONGO_URI_PATTERN,
  PORT_MAX,
  PORT_MIN,
  REDIS_URL_PATTERN,
  HTTPS_URL_PREFIX,
} from '../constants/env';
import { JWT_SECRET_MIN_LENGTH } from '../constants/auth';
import { isEncryptionKey } from '../utils/crypto/aesGcm';
import {
  DISABLED_PAYMENT_MODE,
  OTP_PROVIDER_MODES,
  PAYMENT_PROVIDER_MODES,
  ARQAM_OTP_MODE,
  PROVIDER_MODES,
  REAL_PROVIDER_MODE,
} from '../constants/providers';
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

/** An optional URL where an empty value (a host form left blank) means unset. */
const optionalUrlOrEmpty = z
  .union([z.literal(''), z.url()])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** Raw environment variables → validated, typed values. Secrets have no defaults. */
const booleanText = z.enum(['true', 'false']).transform((value) => value === 'true');
const providerMode = z.enum(PROVIDER_MODES).optional();
const paymentProviderMode = z.enum(PAYMENT_PROVIDER_MODES).optional();
const otpProviderMode = z.enum(OTP_PROVIDER_MODES).optional();
const otpSecret = z.string().min(OTP_SECRET_MIN_LENGTH).optional();

export const envSchema = z
  .object({
    [ENV_KEYS.nodeEnv]: z.enum(ENVIRONMENTS).default(DEFAULT_ENVIRONMENT),
    [ENV_KEYS.port]: z.coerce.number().int().min(PORT_MIN).max(PORT_MAX).default(DEFAULT_PORT),
    [ENV_KEYS.logLevel]: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
    [ENV_KEYS.corsAllowedOrigins]: z.string().default('').transform(splitList),
    [ENV_KEYS.appLinksAndroidPackages]: z.string().default('').transform(splitList),
    [ENV_KEYS.appLinksAndroidSha256]: z.string().default('').transform(splitList),
    [ENV_KEYS.appLinksIosAppIds]: z.string().default('').transform(splitList),
    [ENV_KEYS.appLinksPlayStoreUrl]: optionalUrlOrEmpty,
    [ENV_KEYS.appLinksAppStoreUrl]: optionalUrlOrEmpty,
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
    // Optional outside production (bank-details endpoints answer 503 without it); never has a default.
    [ENV_KEYS.payoutEncryptionKey]: z.string().refine(isEncryptionKey).optional(),
    [ENV_KEYS.otpProvider]: otpProviderMode,
    [ENV_KEYS.storageProvider]: providerMode,
    [ENV_KEYS.notifierProvider]: providerMode,
    [ENV_KEYS.paymentProvider]: paymentProviderMode,
    [ENV_KEYS.fcmServiceAccountJson]: z.string().min(1).optional(),
    [ENV_KEYS.fcmProjectId]: z.string().min(1).optional(),
    [ENV_KEYS.arqamApiKey]: z.string().trim().min(1).optional(),
    [ENV_KEYS.arqamBaseUrl]: optionalUrlOrEmpty,
    [ENV_KEYS.arqamTemplateAr]: z.string().regex(ARQAM_TEMPLATE_NAME_PATTERN).optional(),
    [ENV_KEYS.arqamTemplateEn]: z.string().regex(ARQAM_TEMPLATE_NAME_PATTERN).optional(),
    [ENV_KEYS.arqamSenderId]: z.string().regex(ARQAM_SENDER_ID_PATTERN).optional(),
    [ENV_KEYS.arqamSendIp]: booleanText.default(false),
    [ENV_KEYS.otpCodeSecret]: otpSecret,
    [ENV_KEYS.otpProofSecret]: otpSecret,
    [ENV_KEYS.otpFixedCode]: z.string().regex(OTP_FIXED_CODE_PATTERN).optional(),
    [ENV_KEYS.fcmDryRun]: booleanText.default(false),
    [ENV_KEYS.seedDemoOnStart]: booleanText.default(false),
    [ENV_KEYS.seedDemoDatabase]: z.string().regex(MONGO_DATABASE_NAME_PATTERN).optional(),
    [ENV_KEYS.smtpHost]: z.string().min(1).optional(),
    [ENV_KEYS.smtpPort]: z.coerce
      .number()
      .int()
      .min(PORT_MIN)
      .max(PORT_MAX)
      .default(DEFAULT_SMTP_PORT),
    [ENV_KEYS.smtpSecure]: booleanText.default(false),
    [ENV_KEYS.smtpUser]: z.string().min(1).optional(),
    [ENV_KEYS.smtpPass]: z.string().min(1).optional(),
    [ENV_KEYS.emailFromAddress]: z.email().optional(),
    [ENV_KEYS.emailFromName]: z.string().min(1).default(DEFAULT_EMAIL_FROM_NAME),
    [ENV_KEYS.s3Region]: z.string().min(1).optional(),
    [ENV_KEYS.s3PublicBucket]: z.string().min(1).optional(),
    [ENV_KEYS.s3PrivateBucket]: z.string().min(1).optional(),
    [ENV_KEYS.s3Endpoint]: z.url().optional(),
    [ENV_KEYS.s3ForcePathStyle]: booleanText.default(false),
    [ENV_KEYS.s3AccessKeyId]: z.string().min(1).optional(),
    [ENV_KEYS.s3SecretAccessKey]: z.string().min(1).optional(),
    [ENV_KEYS.cdnBaseUrl]: z.url().optional(),
    [ENV_KEYS.cloudfrontBaseUrl]: z.url().optional(),
    [ENV_KEYS.cloudfrontKeyPairId]: z.string().min(1).optional(),
    [ENV_KEYS.cloudfrontPrivateKey]: z.string().min(1).optional(),
  })
  // Production never runs on fakes, and never guesses: every provider must be named `real`.
  .superRefine((env, context) => {
    // ARQAM OTP needs the key, both templates and both secrets (BUSINESS_DOMAIN §3.1a).
    if (env[ENV_KEYS.otpProvider] === ARQAM_OTP_MODE) {
      for (const key of OTP_ARQAM_REQUIRED_KEYS) {
        if (env[key] === undefined) context.addIssue({ code: 'custom', path: [key], message: key });
      }
    }
    // One secret for codes at rest, another for `otpToken`: a leak of one never forges the other.
    const codeSecret = env[ENV_KEYS.otpCodeSecret];
    if (codeSecret !== undefined && codeSecret === env[ENV_KEYS.otpProofSecret]) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.otpProofSecret],
        message: ENV_KEYS.otpProofSecret,
      });
    }
    // A real notifier needs its credentials; the error names keys only, never values.
    if (env[ENV_KEYS.notifierProvider] === REAL_PROVIDER_MODE) {
      for (const key of NOTIFIER_REAL_REQUIRED_KEYS) {
        if (env[key] === undefined) context.addIssue({ code: 'custom', path: [key], message: key });
      }
      const user = env[ENV_KEYS.smtpUser];
      const pass = env[ENV_KEYS.smtpPass];
      if ((user === undefined) !== (pass === undefined)) {
        context.addIssue({ code: 'custom', path: [ENV_KEYS.smtpPass], message: ENV_KEYS.smtpPass });
      }
    }
    // A real storage needs its buckets and CDN; credentials are optional (IAM role) but come in pairs.
    if (env[ENV_KEYS.storageProvider] === REAL_PROVIDER_MODE) {
      for (const key of STORAGE_REAL_REQUIRED_KEYS) {
        if (env[key] === undefined) context.addIssue({ code: 'custom', path: [key], message: key });
      }
      const id = env[ENV_KEYS.s3AccessKeyId];
      const secret = env[ENV_KEYS.s3SecretAccessKey];
      if ((id === undefined) !== (secret === undefined)) {
        context.addIssue({
          code: 'custom',
          path: [ENV_KEYS.s3SecretAccessKey],
          message: ENV_KEYS.s3SecretAccessKey,
        });
      }
      const given = CLOUDFRONT_KEYS.filter((key) => env[key] !== undefined);
      if (given.length > 0 && given.length < CLOUDFRONT_KEYS.length) {
        for (const key of CLOUDFRONT_KEYS) {
          if (env[key] === undefined)
            context.addIssue({ code: 'custom', path: [key], message: key });
        }
      }
    }
    if (env[ENV_KEYS.nodeEnv] !== 'production') return;
    // Demo data at startup under production rules only with the hosted dev database named (SRV-160).
    if (env[ENV_KEYS.seedDemoOnStart] && env[ENV_KEYS.seedDemoDatabase] === undefined) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.seedDemoDatabase],
        message: ENV_KEYS.seedDemoDatabase,
      });
    }
    if (env[ENV_KEYS.payoutEncryptionKey] === undefined) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.payoutEncryptionKey],
        message: ENV_KEYS.payoutEncryptionKey,
      });
    }
    for (const key of PROVIDER_ENV_KEYS) {
      if (env[key] !== REAL_PROVIDER_MODE)
        context.addIssue({ code: 'custom', path: [key], message: key });
    }
    // Phone OTP in production is ARQAM only; the fake channel and its fixed code are refused.
    if (env[ENV_KEYS.otpProvider] !== ARQAM_OTP_MODE) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.otpProvider],
        message: ENV_KEYS.otpProvider,
      });
    }
    if (env[ENV_KEYS.otpFixedCode] !== undefined) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.otpFixedCode],
        message: ENV_KEYS.otpFixedCode,
      });
    }
    const arqamBaseUrl = env[ENV_KEYS.arqamBaseUrl];
    if (arqamBaseUrl !== undefined && !arqamBaseUrl.startsWith(HTTPS_URL_PREFIX)) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.arqamBaseUrl],
        message: ENV_KEYS.arqamBaseUrl,
      });
    }
    // Payments are paused: production names `disabled` explicitly and never runs a fake gateway.
    if (env[ENV_KEYS.paymentProvider] !== DISABLED_PAYMENT_MODE) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.paymentProvider],
        message: ENV_KEYS.paymentProvider,
      });
    }
  });

export type RawEnv = z.infer<typeof envSchema>;
