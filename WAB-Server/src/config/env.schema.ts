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
  DEFAULT_PAYMENT_GATEWAY,
  HYPERPAY_TEST_MODES,
  HYPERPAY_WEBHOOK_KEY_PATTERN,
  NOTIFIER_REAL_REQUIRED_KEYS,
  PAYMENT_GATEWAYS,
  PAYMENT_REAL_REQUIRED_KEYS,
  ANALYTICS_PRODUCTION_REQUIRED_KEYS,
  OTP_REAL_REQUIRED_KEYS,
  FIREBASE_EMULATOR_HOST_PATTERN,
  STORAGE_REAL_REQUIRED_KEYS,
  CLOUDFRONT_KEYS,
  MONGO_URI_PATTERN,
  PORT_MAX,
  PORT_MIN,
  REDIS_URL_PATTERN,
} from '../constants/env';
import { JWT_SECRET_MIN_LENGTH } from '../constants/auth';
import { isEncryptionKey } from '../utils/crypto/aesGcm';
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
const booleanText = z.enum(['true', 'false']).transform((value) => value === 'true');
const providerMode = z.enum(PROVIDER_MODES).optional();

/** A JSON object given as text (service-account keys); the content is never echoed. */
const isJsonObject = (text: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

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
    // Optional outside production (bank-details endpoints answer 503 without it); never has a default.
    [ENV_KEYS.payoutEncryptionKey]: z.string().refine(isEncryptionKey).optional(),
    [ENV_KEYS.otpProvider]: providerMode,
    [ENV_KEYS.storageProvider]: providerMode,
    [ENV_KEYS.notifierProvider]: providerMode,
    [ENV_KEYS.paymentProvider]: providerMode,
    [ENV_KEYS.analyticsProvider]: providerMode,
    [ENV_KEYS.fcmServiceAccountJson]: z.string().min(1).optional(),
    [ENV_KEYS.fcmProjectId]: z.string().min(1).optional(),
    [ENV_KEYS.firebaseProjectId]: z.string().min(1).optional(),
    [ENV_KEYS.firebaseAuthEmulatorHost]: z
      .string()
      .regex(FIREBASE_EMULATOR_HOST_PATTERN)
      .optional(),
    [ENV_KEYS.fcmDryRun]: booleanText.default(false),
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
    [ENV_KEYS.paymentGateway]: z.enum(PAYMENT_GATEWAYS).default(DEFAULT_PAYMENT_GATEWAY),
    [ENV_KEYS.hyperpayBaseUrl]: z.url().optional(),
    [ENV_KEYS.hyperpayEntityId]: z.string().min(1).optional(),
    [ENV_KEYS.hyperpayAccess]: z.string().min(1).optional(),
    [ENV_KEYS.hyperpayWebhookKey]: z.string().regex(HYPERPAY_WEBHOOK_KEY_PATTERN).optional(),
    [ENV_KEYS.hyperpayReturnUrl]: z.url().optional(),
    [ENV_KEYS.hyperpayTestMode]: z.enum(HYPERPAY_TEST_MODES).optional(),
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
    [ENV_KEYS.analyticsBigqueryProjectId]: z.string().min(1).optional(),
    [ENV_KEYS.analyticsBigqueryDataset]: z.string().min(1).optional(),
    [ENV_KEYS.analyticsBigqueryLocation]: z.string().min(1).optional(),
    [ENV_KEYS.analyticsBigqueryCredentialsJson]: z.string().refine(isJsonObject).optional(),
    [ENV_KEYS.analyticsBigqueryCrashTable]: z.string().min(1).optional(),
    [ENV_KEYS.analyticsBigqueryMaxBytesBilled]: z.coerce.number().int().positive().optional(),
  })
  // Production never runs on fakes, and never guesses: every provider must be named `real`.
  .superRefine((env, context) => {
    // A real OTP provider needs the Firebase project; the emulator is for development only.
    if (env[ENV_KEYS.otpProvider] === REAL_PROVIDER_MODE) {
      for (const key of OTP_REAL_REQUIRED_KEYS) {
        if (env[key] === undefined) context.addIssue({ code: 'custom', path: [key], message: key });
      }
    }
    if (
      env[ENV_KEYS.nodeEnv] === 'production' &&
      env[ENV_KEYS.firebaseAuthEmulatorHost] !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: [ENV_KEYS.firebaseAuthEmulatorHost],
        message: ENV_KEYS.firebaseAuthEmulatorHost,
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
    // BigQuery needs project and dataset together; production needs the whole group.
    if (env[ENV_KEYS.analyticsProvider] === REAL_PROVIDER_MODE) {
      const project = env[ENV_KEYS.analyticsBigqueryProjectId];
      const dataset = env[ENV_KEYS.analyticsBigqueryDataset];
      if ((project === undefined) !== (dataset === undefined)) {
        context.addIssue({
          code: 'custom',
          path: [ENV_KEYS.analyticsBigqueryDataset],
          message: ENV_KEYS.analyticsBigqueryDataset,
        });
      }
      if (env[ENV_KEYS.nodeEnv] === 'production') {
        for (const key of ANALYTICS_PRODUCTION_REQUIRED_KEYS) {
          if (env[key] === undefined) {
            context.addIssue({ code: 'custom', path: [key], message: key });
          }
        }
      }
    }
    // A real payment provider needs its HyperPay credentials; the mock gateway also needs its URL.
    if (env[ENV_KEYS.paymentProvider] === REAL_PROVIDER_MODE) {
      const missing: string[] = PAYMENT_REAL_REQUIRED_KEYS.filter((key) => env[key] === undefined);
      if (
        env[ENV_KEYS.paymentGateway] === 'mock-gateway' &&
        env[ENV_KEYS.hyperpayBaseUrl] === undefined
      ) {
        missing.push(ENV_KEYS.hyperpayBaseUrl);
      }
      for (const key of missing) context.addIssue({ code: 'custom', path: [key], message: key });
    }
    if (env[ENV_KEYS.nodeEnv] !== 'production') return;
    if (env[ENV_KEYS.paymentProvider] === REAL_PROVIDER_MODE) {
      const forbidden: string[] = [];
      if (env[ENV_KEYS.paymentGateway] === 'mock-gateway') forbidden.push(ENV_KEYS.paymentGateway);
      if (env[ENV_KEYS.hyperpayTestMode] !== undefined) forbidden.push(ENV_KEYS.hyperpayTestMode);
      if (env[ENV_KEYS.hyperpayWebhookKey] === undefined)
        forbidden.push(ENV_KEYS.hyperpayWebhookKey);
      for (const key of forbidden) context.addIssue({ code: 'custom', path: [key], message: key });
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
  });

export type RawEnv = z.infer<typeof envSchema>;
