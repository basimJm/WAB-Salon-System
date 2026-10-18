import {
  CONTENT_TYPE_HEADER,
  ERROR_CODES,
  UPLOAD_METHOD,
  type Visibility,
} from '../../constants/codes';
import { DELETE_BATCH_SIZE, MAGIC_BYTES_LENGTH } from '../../constants/defaults';
import type { ResolvedConfig } from '../../config/options';
import { judgeUpload } from '../../confirm';
import { StorageError, validationError } from '../../errors';
import { realRetryDeps, withRetry, type RetryDeps } from '../../retry';
import type {
  ConfirmUploadRequest,
  ConfirmUploadResult,
  SignedUrlRequest,
  StorageProvider,
  UploadTarget,
  UploadUrlRequest,
  WriteObjectRequest,
} from '../../types';
import {
  assertConfirmRequest,
  assertKey,
  assertSignedRequest,
  assertUploadRequest,
  assertWriteRequest,
} from '../../validation';
import { createCloudFrontSigner, publicUrlOf } from '../../urls';
import { createAwsDeps, type S3Command, type S3Deps, type S3Output } from './deps';
import { isNotFound, mapS3Error } from './errors';

const MS_PER_SECOND = 1_000;
const VISIBILITY_ORDER: readonly Visibility[] = ['PUBLIC', 'PRIVATE'];
const RANGE_HEADER_BYTES = `bytes=0-${String(MAGIC_BYTES_LENGTH - 1)}`;
const ALREADY_GONE = 'NoSuchKey';

type S3Settings = Pick<
  ResolvedConfig,
  | 'cdnBaseUrl'
  | 'cloudFront'
  | 'uploadMaxTtlSec'
  | 'signedUrlMaxTtlSec'
  | 'readMaxBytes'
  | 'timeoutMs'
  | 'retry'
  | 'publicCacheControl'
  | 'logger'
> & { readonly s3: NonNullable<ResolvedConfig['s3']> };

export interface S3Overrides {
  /** Tests inject a fake client; production loads the AWS SDK lazily. */
  readonly loadDeps?: () => Promise<S3Deps>;
  readonly retryDeps?: RetryDeps;
  readonly now?: () => Date;
}

/** AWS S3 (and S3-compatible: MinIO, DigitalOcean Spaces) behind the storage port. */
export class S3Storage implements StorageProvider {
  private deps: Promise<S3Deps> | undefined;
  private readonly loadDeps: () => Promise<S3Deps>;
  private readonly retryDeps: RetryDeps;
  private readonly now: () => Date;
  private readonly cloudFrontSigner: ((key: string, expiresInSec: number) => string) | undefined;

  constructor(
    private readonly settings: S3Settings,
    overrides: S3Overrides = {},
  ) {
    this.loadDeps = overrides.loadDeps ?? (() => createAwsDeps(settings.s3, settings.timeoutMs));
    this.retryDeps = overrides.retryDeps ?? realRetryDeps;
    this.now = overrides.now ?? (() => new Date());
    this.cloudFrontSigner =
      settings.cloudFront && createCloudFrontSigner(settings.cloudFront, this.now);
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget> {
    assertUploadRequest(request, this.settings.uploadMaxTtlSec);
    const deps = await this.getDeps();
    const command = new deps.commands.Put({
      Bucket: this.bucketOf(request.visibility),
      Key: request.key,
      ContentType: request.contentType,
    });
    const url = await this.presign(deps, command, request.expiresInSec, new Set(['content-type']));
    return {
      url,
      method: UPLOAD_METHOD,
      headers: { [CONTENT_TYPE_HEADER]: request.contentType },
      expiresAt: new Date(this.now().getTime() + request.expiresInSec * MS_PER_SECOND),
    };
  }

  async confirmUpload(request: ConfirmUploadRequest): Promise<ConfirmUploadResult> {
    assertConfirmRequest(request);
    const deps = await this.getDeps();
    const bucket = this.bucketOf(request.visibility);
    const head = await this.exec(
      new deps.commands.Head({ Bucket: bucket, Key: request.key }),
      true,
    );
    if (head === null) return { status: 'REJECTED', reason: 'NOT_FOUND' };
    const size = head.ContentLength;
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0)
      throw new StorageError(
        ERROR_CODES.MALFORMED_RESPONSE,
        'Storage answered without a valid size',
      );
    const early = size === 0 || size > request.maxBytes;
    const bytes = early ? new Uint8Array() : await this.firstBytes(deps, bucket, request.key);
    const reason = judgeUpload(size, bytes, request.contentType, request.maxBytes);
    if (reason === undefined)
      return { status: 'CONFIRMED', size, contentType: request.contentType };
    await this.deleteFromBucket(deps, bucket, [request.key]);
    this.settings.logger.info('storage.upload.rejected', { reason });
    return { status: 'REJECTED', reason };
  }

  getPublicUrl(key: string): string {
    return publicUrlOf(this.settings.cdnBaseUrl, key);
  }

  async getSignedUrl(request: SignedUrlRequest): Promise<string> {
    assertSignedRequest(request, this.settings.signedUrlMaxTtlSec);
    if (this.cloudFrontSigner) return this.cloudFrontSigner(request.key, request.expiresInSec);
    const deps = await this.getDeps();
    const command = new deps.commands.Get({
      Bucket: this.settings.s3.privateBucket,
      Key: request.key,
    });
    return this.presign(deps, command, request.expiresInSec);
  }

  async read(key: string): Promise<Buffer | null> {
    assertKey(key);
    const deps = await this.getDeps();
    for (const visibility of VISIBILITY_ORDER) {
      const output = await this.exec(
        new deps.commands.Get({ Bucket: this.bucketOf(visibility), Key: key }),
        true,
      );
      if (output === null) continue;
      if ((output.ContentLength ?? 0) > this.settings.readMaxBytes)
        throw validationError('Object is larger than the configured read limit');
      return this.bodyOf(output);
    }
    return null;
  }

  async write(request: WriteObjectRequest): Promise<void> {
    assertWriteRequest(request);
    const deps = await this.getDeps();
    await this.exec(
      new deps.commands.Put({
        Bucket: this.bucketOf(request.visibility),
        Key: request.key,
        Body: request.body,
        ContentType: request.contentType,
        ContentLength: request.body.length,
        ...(request.visibility === 'PUBLIC'
          ? { CacheControl: this.settings.publicCacheControl }
          : {}),
      }),
    );
  }

  async delete(keys: readonly string[]): Promise<void> {
    keys.forEach(assertKey);
    const unique = [...new Set(keys)];
    if (unique.length === 0) return;
    const deps = await this.getDeps();
    const failures: string[] = [];
    for (const bucket of [this.settings.s3.publicBucket, this.settings.s3.privateBucket]) {
      for (let start = 0; start < unique.length; start += DELETE_BATCH_SIZE) {
        failures.push(
          ...(await this.deleteFromBucket(
            deps,
            bucket,
            unique.slice(start, start + DELETE_BATCH_SIZE),
          )),
        );
      }
    }
    if (failures.length > 0)
      throw new StorageError(ERROR_CODES.VENDOR_ERROR, 'Some objects could not be deleted', {
        details: { failed: failures.length, codes: [...new Set(failures)] },
      });
  }

  private bucketOf(visibility: Visibility): string {
    return visibility === 'PUBLIC' ? this.settings.s3.publicBucket : this.settings.s3.privateBucket;
  }

  private getDeps(): Promise<S3Deps> {
    this.deps ??= this.loadDeps().catch((error: unknown) => {
      this.deps = undefined;
      throw new StorageError(ERROR_CODES.CONFIG_INVALID, 'The AWS SDK could not be loaded', {
        cause: error,
      });
    });
    return this.deps;
  }

  /** One vendor call: bounded by the timeout, retried when the error says so, always typed. */
  private async exec(command: S3Command, allowMissing: true): Promise<S3Output | null>;
  private async exec(command: S3Command): Promise<S3Output>;
  private async exec(command: S3Command, allowMissing?: true): Promise<S3Output | null> {
    const deps = await this.getDeps();
    return withRetry(
      async () => {
        try {
          return await deps.send(command, AbortSignal.timeout(this.settings.timeoutMs));
        } catch (error) {
          if (allowMissing && isNotFound(error)) return null;
          throw mapS3Error(error);
        }
      },
      this.settings.retry,
      this.retryDeps,
      (attempt, error) => {
        this.settings.logger.warn('storage.retry', { attempt, code: (error as StorageError).code });
      },
    );
  }

  private async presign(
    deps: S3Deps,
    command: S3Command,
    expiresIn: number,
    signableHeaders?: Set<string>,
  ): Promise<string> {
    try {
      return await deps.presign(command, {
        expiresIn,
        ...(signableHeaders === undefined ? {} : { signableHeaders }),
      });
    } catch (error) {
      throw mapS3Error(error);
    }
  }

  private async firstBytes(deps: S3Deps, bucket: string, key: string): Promise<Uint8Array> {
    const output = await this.exec(
      new deps.commands.Get({ Bucket: bucket, Key: key, Range: RANGE_HEADER_BYTES }),
      true,
    );
    return output === null ? new Uint8Array() : this.bodyOf(output);
  }

  private async bodyOf(output: S3Output): Promise<Buffer> {
    if (!output.Body)
      throw new StorageError(ERROR_CODES.MALFORMED_RESPONSE, 'Storage answered without a body');
    try {
      return Buffer.from(await output.Body.transformToByteArray());
    } catch (error) {
      throw mapS3Error(error);
    }
  }

  /** Returns the codes of keys that failed (an already-missing key is success). */
  private async deleteFromBucket(
    deps: S3Deps,
    bucket: string,
    keys: readonly string[],
  ): Promise<string[]> {
    const output = await this.exec(
      new deps.commands.DeleteObjects({
        Bucket: bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    return (output.Errors ?? [])
      .filter((entry) => entry.Code !== ALREADY_GONE)
      .map((entry) => entry.Code ?? ERROR_CODES.UNKNOWN);
  }
}
