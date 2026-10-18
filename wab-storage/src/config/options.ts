import { z } from 'zod';
import {
  ENVIRONMENTS,
  PROVIDERS,
  SIGNED_URL_MODES,
  type Environment,
  type ProviderName,
} from '../constants/codes';
import {
  DEFAULT_PUBLIC_CACHE_CONTROL,
  DEFAULT_READ_MAX_BYTES,
  DEFAULT_RETRY,
  DEFAULT_SIGNED_URL_MAX_TTL_SEC,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_UPLOAD_MAX_TTL_SEC,
  DEFAULT_VARIANTS,
  MAX_PRESIGN_TTL_SEC,
} from '../constants/defaults';
import { configError } from '../errors';
import type { RetryPolicy } from '../retry';
import type { CloudFrontSigning } from '../urls';
import type { ImageProcessor } from '../variants';
import { noopLogger, redactingLogger, type Logger } from '../logger';

const text = z.string().trim().min(1);
const positiveInt = z.number().int().positive();

const credentialsSchema = z
  .object({
    accessKeyId: text,
    secretAccessKey: text,
    sessionToken: text.optional(),
  })
  .strict();

const s3Schema = z
  .object({
    region: text,
    publicBucket: text,
    privateBucket: text,
    /** S3-compatible endpoint (MinIO, DigitalOcean Spaces); unset for AWS. */
    endpoint: z.url().optional(),
    forcePathStyle: z.boolean().optional(),
    /** Unset = the SDK's default provider chain (IAM role). */
    credentials: credentialsSchema.optional(),
  })
  .strict();

const localFsSchema = z.object({ rootDir: text, baseUrl: z.url() }).strict();

const retrySchema = z
  .object({
    maxAttempts: positiveInt.max(10),
    baseDelayMs: positiveInt,
    maxDelayMs: positiveInt,
    jitterRatio: z.number().min(0).max(1),
  })
  .partial()
  .strict();

const variantsSchema = z
  .object({
    thumbWidth: positiveInt,
    mediumWidth: positiveInt,
    quality: positiveInt.max(100),
  })
  .partial()
  .strict();

const ttlSchema = z.object({ maxTtlSec: positiveInt.max(MAX_PRESIGN_TTL_SEC) }).strict();

const cloudFrontSchema = z.object({ baseUrl: z.url(), keyPairId: text, privateKey: text }).strict();

const optionsSchema = z
  .object({
    environment: z.enum(ENVIRONMENTS),
    provider: z.enum(PROVIDERS),
    s3: s3Schema.optional(),
    localFs: localFsSchema.optional(),
    /** Base URL public objects are served from (CDN domain). */
    cdn: z.object({ baseUrl: z.url() }).strict(),
    upload: ttlSchema.partial().optional(),
    signedUrl: ttlSchema
      .extend({
        /** `s3` = presigned S3 GET; `cloudfront` = CloudFront signed URL on a private distribution. */
        mode: z.enum(SIGNED_URL_MODES),
        cloudfront: cloudFrontSchema,
      })
      .partial()
      .strict()
      .optional(),
    readMaxBytes: positiveInt.optional(),
    /** Cache-Control for public objects written by the server (variants); keys are immutable. */
    publicCacheControl: text.optional(),
    timeoutMs: positiveInt.optional(),
    retry: retrySchema.optional(),
    variants: variantsSchema.optional(),
  })
  .strict();

export interface StorageOptions extends z.input<typeof optionsSchema> {
  readonly logger?: Logger;
  /** Image processing adapter; defaults to `sharp` (loaded lazily). */
  readonly imageProcessor?: ImageProcessor;
}

export interface S3Config {
  readonly region: string;
  readonly publicBucket: string;
  readonly privateBucket: string;
  readonly endpoint?: string | undefined;
  readonly forcePathStyle: boolean;
  readonly credentials?: z.infer<typeof credentialsSchema> | undefined;
}

export interface VariantConfig {
  readonly thumbWidth: number;
  readonly mediumWidth: number;
  readonly quality: number;
  readonly thumbSuffix: string;
  readonly mediumSuffix: string;
  readonly extension: string;
  readonly contentType: string;
}

export interface ResolvedConfig {
  readonly environment: Environment;
  readonly provider: ProviderName;
  readonly s3?: S3Config | undefined;
  readonly localFs?: z.infer<typeof localFsSchema> | undefined;
  readonly cdnBaseUrl: string;
  readonly uploadMaxTtlSec: number;
  readonly signedUrlMaxTtlSec: number;
  readonly cloudFront?: CloudFrontSigning | undefined;
  readonly readMaxBytes: number;
  readonly publicCacheControl: string;
  readonly timeoutMs: number;
  readonly retry: RetryPolicy;
  readonly variants: VariantConfig;
  readonly logger: Logger;
}

/** Injected objects (not plain data), validated by type rather than by the schema. */
const NON_SCHEMA_OPTIONS = ['logger', 'imageProcessor'];

const isHttps = (url: string): boolean => new URL(url).protocol === 'https:';
const trimSlash = (url: string): string => url.replace(/\/+$/, '');

/** Cross-field rules: what each provider needs, and what production refuses. */
const crossFieldIssues = (
  o: z.infer<typeof optionsSchema>,
): { path: string; message: string }[] => {
  const issues: { path: string; message: string }[] = [];
  const add = (path: string, message: string): void => {
    issues.push({ path, message });
  };
  if (o.provider === 's3' && !o.s3) add('s3', 'required for provider s3');
  if (o.provider === 'local-fs' && !o.localFs) add('localFs', 'required for provider local-fs');
  if (o.s3 && o.s3.publicBucket === o.s3.privateBucket && o.environment === 'prod')
    add('s3.privateBucket', 'must differ from publicBucket in prod');
  if (o.signedUrl?.mode === 'cloudfront') {
    if (!o.signedUrl.cloudfront) add('signedUrl.cloudfront', 'required for mode cloudfront');
    if (o.provider !== 's3') add('signedUrl.mode', 'cloudfront needs the s3 provider');
    if (
      o.environment === 'prod' &&
      o.signedUrl.cloudfront &&
      !isHttps(o.signedUrl.cloudfront.baseUrl)
    )
      add('signedUrl.cloudfront.baseUrl', 'prod requires https');
  }
  if (o.environment === 'prod') {
    if (o.provider !== 's3') add('provider', 'prod requires the s3 provider');
    if (!isHttps(o.cdn.baseUrl)) add('cdn.baseUrl', 'prod requires https');
    if (o.s3?.endpoint !== undefined && !isHttps(o.s3.endpoint))
      add('s3.endpoint', 'prod requires https');
  }
  return issues;
};

/** Validates the options once; the error names fields only, never values. */
export const resolveConfig = (options: StorageOptions): ResolvedConfig => {
  const { logger } = options;
  const plain = Object.fromEntries(
    Object.entries(options).filter(([name]) => !NON_SCHEMA_OPTIONS.includes(name)),
  );
  const parsed = optionsSchema.safeParse(plain);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    throw configError(`Invalid storage options: ${fields.join(', ')}`, { fields });
  }
  const o = parsed.data;
  const issues = crossFieldIssues(o);
  if (issues.length > 0) {
    const fields = issues.map((issue) => issue.path);
    throw configError(
      `Invalid storage options: ${issues.map((i) => `${i.path} (${i.message})`).join(', ')}`,
      { fields },
    );
  }
  const retry = {
    maxAttempts: o.retry?.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
    baseDelayMs: o.retry?.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs,
    maxDelayMs: o.retry?.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs,
    jitterRatio: o.retry?.jitterRatio ?? DEFAULT_RETRY.jitterRatio,
  };
  return {
    environment: o.environment,
    provider: o.provider,
    s3: o.s3 && {
      region: o.s3.region,
      publicBucket: o.s3.publicBucket,
      privateBucket: o.s3.privateBucket,
      endpoint: o.s3.endpoint,
      forcePathStyle: o.s3.forcePathStyle ?? false,
      credentials: o.s3.credentials,
    },
    localFs: o.localFs && { ...o.localFs, baseUrl: trimSlash(o.localFs.baseUrl) },
    cdnBaseUrl: trimSlash(o.cdn.baseUrl),
    uploadMaxTtlSec: o.upload?.maxTtlSec ?? DEFAULT_UPLOAD_MAX_TTL_SEC,
    signedUrlMaxTtlSec: o.signedUrl?.maxTtlSec ?? DEFAULT_SIGNED_URL_MAX_TTL_SEC,
    cloudFront: o.signedUrl?.mode === 'cloudfront' ? o.signedUrl.cloudfront : undefined,
    readMaxBytes: o.readMaxBytes ?? DEFAULT_READ_MAX_BYTES,
    publicCacheControl: o.publicCacheControl ?? DEFAULT_PUBLIC_CACHE_CONTROL,
    timeoutMs: o.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retry,
    variants: {
      ...DEFAULT_VARIANTS,
      thumbWidth: o.variants?.thumbWidth ?? DEFAULT_VARIANTS.thumbWidth,
      mediumWidth: o.variants?.mediumWidth ?? DEFAULT_VARIANTS.mediumWidth,
      quality: o.variants?.quality ?? DEFAULT_VARIANTS.quality,
    },
    logger: redactingLogger(logger ?? noopLogger),
  };
};
