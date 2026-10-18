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
  SignedUrlRequest,
  StorageProvider,
  UploadTarget,
  UploadUrlRequest,
  WriteObjectRequest,
} from './types';

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

/** Storage backed by the `wab-storage` SDK (S3 + CDN). */
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
    getPublicUrl: (key: string): string => {
      try {
        return sdk.getPublicUrl(key);
      } catch (error) {
        return mapStorageError(error);
      }
    },
    getSignedUrl: (request: SignedUrlRequest): Promise<string> =>
      guarded(() => sdk.getSignedUrl(request)),
    read: (key: string): Promise<Buffer | null> => guarded(() => sdk.read(key)),
    write: (request: WriteObjectRequest): Promise<void> => guarded(() => sdk.write(request)),
    delete: (keys: readonly string[]): Promise<void> => guarded(() => sdk.delete(keys)),
  };
};
