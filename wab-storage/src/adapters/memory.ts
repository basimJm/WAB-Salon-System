import {
  CONTENT_TYPE_HEADER,
  ERROR_CODES,
  UPLOAD_METHOD,
  type Visibility,
} from '../constants/codes';
import { MAGIC_BYTES_LENGTH } from '../constants/defaults';
import { judgeUpload } from '../confirm';
import type { ResolvedConfig } from '../config/options';
import { StorageError } from '../errors';
import type {
  ConfirmUploadRequest,
  CopyObjectRequest,
  ConfirmUploadResult,
  ObjectInfo,
  SignedUrlRequest,
  StorageProvider,
  UploadTarget,
  UploadUrlRequest,
  WriteObjectRequest,
} from '../types';
import {
  assertConfirmRequest,
  assertCopyRequest,
  assertKey,
  assertSignedRequest,
  assertUploadRequest,
  assertWriteRequest,
  encodeKey,
} from '../validation';

const MS_PER_SECOND = 1_000;
const UPLOAD_PATH = '__upload';
const PRIVATE_PATH = 'private';

interface Pending {
  readonly visibility: Visibility;
  readonly expiresAt: number;
  readonly contentType: string;
}
interface Stored {
  readonly visibility: Visibility;
  readonly body: Buffer;
  readonly contentType: string | null;
  readonly updatedAt: Date;
}

/** In-memory storage for tests and offline dev. Production config refuses it. */
export class MemoryStorage implements StorageProvider {
  private readonly pending = new Map<string, Pending>();
  private readonly objects = new Map<string, Stored>();

  constructor(
    private readonly config: Pick<
      ResolvedConfig,
      'cdnBaseUrl' | 'uploadMaxTtlSec' | 'signedUrlMaxTtlSec'
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget> {
    return run(() => {
      assertUploadRequest(request, this.config.uploadMaxTtlSec);
      const expiresAt = new Date(this.now().getTime() + request.expiresInSec * MS_PER_SECOND);
      this.pending.set(request.key, {
        visibility: request.visibility,
        expiresAt: expiresAt.getTime(),
        contentType: request.contentType,
      });
      return {
        url: `${this.config.cdnBaseUrl}/${UPLOAD_PATH}/${encodeKey(request.key)}`,
        method: UPLOAD_METHOD,
        headers: { [CONTENT_TYPE_HEADER]: request.contentType },
        expiresAt,
      };
    });
  }

  confirmUpload(request: ConfirmUploadRequest): Promise<ConfirmUploadResult> {
    return run(() => {
      assertConfirmRequest(request);
      const stored = this.objects.get(request.key);
      if (stored?.visibility !== request.visibility)
        return { status: 'REJECTED', reason: 'NOT_FOUND' };
      const head = stored.body.subarray(0, MAGIC_BYTES_LENGTH);
      const reason = judgeUpload(stored.body.length, head, request.contentType, request.maxBytes);
      if (reason) {
        this.objects.delete(request.key);
        return { status: 'REJECTED', reason };
      }
      return { status: 'CONFIRMED', size: stored.body.length, contentType: request.contentType };
    });
  }

  getPublicUrl(key: string): string {
    assertKey(key);
    if (this.objects.get(key)?.visibility === 'PRIVATE') throw new RangeError('object is private');
    return `${this.config.cdnBaseUrl}/${encodeKey(key)}`;
  }

  getSignedUrl(request: SignedUrlRequest): Promise<string> {
    return run(() => {
      assertSignedRequest(request, this.config.signedUrlMaxTtlSec);
      const expires = this.now().getTime() + request.expiresInSec * MS_PER_SECOND;
      return `${this.config.cdnBaseUrl}/${PRIVATE_PATH}/${encodeKey(request.key)}?expires=${String(expires)}&signature=memory`;
    });
  }

  read(key: string): Promise<Buffer | null> {
    return run(() => {
      assertKey(key);
      return this.objects.get(key)?.body ?? null;
    });
  }

  write(request: WriteObjectRequest): Promise<void> {
    return run(() => {
      assertWriteRequest(request);
      this.objects.set(request.key, {
        visibility: request.visibility,
        body: request.body,
        contentType: request.contentType,
        updatedAt: this.now(),
      });
    });
  }

  delete(keys: readonly string[]): Promise<void> {
    return run(() => {
      keys.forEach(assertKey);
      for (const key of keys) {
        this.pending.delete(key);
        this.objects.delete(key);
      }
    });
  }

  copy(request: CopyObjectRequest): Promise<void> {
    return run(() => {
      assertCopyRequest(request);
      const source = this.objects.get(request.fromKey);
      if (source?.visibility !== request.visibility)
        throw new StorageError(ERROR_CODES.OBJECT_NOT_FOUND, 'Source object does not exist');
      this.objects.set(request.toKey, { ...source, updatedAt: this.now() });
    });
  }

  stat(key: string): Promise<ObjectInfo | null> {
    return run(() => {
      assertKey(key);
      const stored = this.objects.get(key);
      return stored === undefined
        ? null
        : {
            visibility: stored.visibility,
            size: stored.body.length,
            contentType: stored.contentType,
            updatedAt: stored.updatedAt,
          };
    });
  }

  /** Test helper: the client PUTs to the presigned URL. False when no valid URL exists (403). */
  simulateUpload(key: string, body: Buffer): boolean {
    const upload = this.pending.get(key);
    if (upload === undefined || upload.expiresAt <= this.now().getTime()) return false;
    this.objects.set(key, {
      visibility: upload.visibility,
      body,
      contentType: upload.contentType,
      updatedAt: this.now(),
    });
    return true;
  }

  /** Test helper: is there a stored object under the key? */
  has(key: string): boolean {
    return this.objects.has(key);
  }

  /** Test helper: number of stored objects (leak checks). */
  get size(): number {
    return this.objects.size;
  }
}

/** Answers with a promise even when validation throws synchronously. */
const run = <T>(work: () => T): Promise<T> => {
  try {
    return Promise.resolve(work());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
};
