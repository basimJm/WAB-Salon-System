import {
  createStorage,
  ERROR_CODES as SDK_ERRORS,
  isStorageError,
  type Storage,
  type StorageOptions,
} from '@wab/storage';
import type { StorageSettings } from '../../config';
import { STORAGE_SIGNED_URL_MAX_TTL_SEC } from '../../constants/providers';
import { UPLOAD_URL_TTL_SEC } from '../../constants/uploads';
import { ExternalServiceError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import type {
  ConfirmUploadRequest,
  ConfirmUploadResult,
  CopyObjectRequest,
  CopyObjectResult,
  ObjectInfo,
  SignedUrlRequest,
  StorageProvider,
  UploadTarget,
  UploadUrlRequest,
  WriteObjectRequest,
} from './types';
import { objectKeyOf, parseFileRef, withVersion } from './fileRef';

export interface RealStorageDeps {
  readonly settings: StorageSettings;
  readonly isProduction: boolean;
  readonly logger: Logger;
  /** Replaces the SDK factory (tests). */
  readonly build?: (options: StorageOptions) => Storage;
}

/** SDK errors that mean the caller sent something invalid: a bug here, not a provider outage. */
const CALLER_ERRORS: readonly string[] = [
  SDK_ERRORS.VALIDATION_FAILED,
  SDK_ERRORS.KEY_INVALID,
  SDK_ERRORS.TYPE_NOT_ALLOWED,
];

/** Provider failures become typed 502/503 errors; the vendor text never reaches a client. */
export const mapStorageError = (error: unknown): never => {
  if (!isStorageError(error)) throw error;
  if (CALLER_ERRORS.includes(error.code))
    throw new RangeError(`storage request rejected: ${error.code}`);
  throw new ExternalServiceError({ cause: error, unavailable: error.retryable });
};

const guarded = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    return mapStorageError(error);
  }
};

/** Maps the server's settings to the SDK options (the only place that knows both vocabularies). */
export const toStorageOptions = (deps: RealStorageDeps): StorageOptions => {
  const { settings } = deps;
  const common = {
    environment: deps.isProduction ? ('prod' as const) : ('dev' as const),
    cdn: { baseUrl: settings.cdnBaseUrl },
    upload: { maxTtlSec: UPLOAD_URL_TTL_SEC },
    logger: toSdkLogger(deps.logger),
  };
  // Cloudflare R2 (SRV-180): the SDK maps it onto the S3 API (account endpoint, region `auto`).
  if (settings.provider === 'r2') {
    return {
      ...common,
      provider: 'r2',
      r2: {
        accountId: settings.accountId,
        publicBucket: settings.publicBucket,
        privateBucket: settings.privateBucket,
        ...(settings.endpoint === undefined ? {} : { endpoint: settings.endpoint }),
        credentials: { ...settings.credentials },
      },
      signedUrl: { maxTtlSec: STORAGE_SIGNED_URL_MAX_TTL_SEC, mode: 's3' },
    };
  }
  return {
    environment: deps.isProduction ? 'prod' : 'dev',
    provider: 's3',
    s3: {
      region: settings.region,
      publicBucket: settings.publicBucket,
      privateBucket: settings.privateBucket,
      forcePathStyle: settings.forcePathStyle,
      ...(settings.endpoint === undefined ? {} : { endpoint: settings.endpoint }),
      ...(settings.credentials === undefined ? {} : { credentials: { ...settings.credentials } }),
    },
    cdn: { baseUrl: settings.cdnBaseUrl },
    upload: { maxTtlSec: UPLOAD_URL_TTL_SEC },
    signedUrl: {
      maxTtlSec: STORAGE_SIGNED_URL_MAX_TTL_SEC,
      ...(settings.cloudfront === undefined
        ? { mode: 's3' as const }
        : { mode: 'cloudfront' as const, cloudfront: { ...settings.cloudfront } }),
    },
    logger: toSdkLogger(deps.logger),
  };
};

/** Storage backed by the `wab-storage` SDK (Cloudflare R2, or AWS S3 + CDN). */
export const createRealStorage = (deps: RealStorageDeps): StorageProvider => {
  const sdk = (deps.build ?? createStorage)(toStorageOptions(deps));
  return {
    createUploadUrl: (request: UploadUrlRequest): Promise<UploadTarget> =>
      guarded(() => sdk.createUploadUrl(request)),
    confirmUpload: (request: ConfirmUploadRequest): Promise<ConfirmUploadResult> =>
      guarded(async () => {
        const result = await sdk.confirmUpload(request);
        if (result.status === 'CONFIRMED') return result;
        // The domain has no separate "empty file" reason: an empty file is not the declared type.
        return {
          status: 'REJECTED',
          reason: result.reason === 'EMPTY' ? 'TYPE_MISMATCH' : result.reason,
        };
      }),
    // Stored references may carry a slot version (`key?v=3`, SRV-181): the object is the key, the
    // public URL keeps the version so caches refresh after a replacement.
    getPublicUrl: (ref: string): string => {
      const parsed = parseFileRef(ref);
      try {
        return withVersion(sdk.getPublicUrl(parsed.key), parsed);
      } catch (error) {
        return mapStorageError(error);
      }
    },
    getSignedUrl: (request: SignedUrlRequest): Promise<string> =>
      guarded(() => sdk.getSignedUrl({ ...request, key: objectKeyOf(request.key) })),
    read: (ref: string): Promise<Buffer | null> => guarded(() => sdk.read(objectKeyOf(ref))),
    write: (request: WriteObjectRequest): Promise<void> => guarded(() => sdk.write(request)),
    delete: (refs: readonly string[]): Promise<void> =>
      guarded(() => sdk.delete(refs.map(objectKeyOf))),
    copy: (request: CopyObjectRequest): Promise<CopyObjectResult> =>
      guarded(async () => {
        try {
          await sdk.copy(request);
          return 'COPIED';
        } catch (error) {
          // A missing source is an answer (nothing changed), not a provider failure.
          if (isStorageError(error) && error.code === SDK_ERRORS.OBJECT_NOT_FOUND)
            return 'SOURCE_MISSING';
          throw error;
        }
      }),
    stat: (ref: string): Promise<ObjectInfo | null> => guarded(() => sdk.stat(objectKeyOf(ref))),
  };
};
