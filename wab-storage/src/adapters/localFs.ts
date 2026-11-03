import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  CONTENT_TYPE_HEADER,
  ERROR_CODES,
  UPLOAD_METHOD,
  type Visibility,
} from '../constants/codes';
import { MAGIC_BYTES_LENGTH } from '../constants/defaults';
import type { ResolvedConfig } from '../config/options';
import { judgeUpload } from '../confirm';
import { StorageError, isStorageError } from '../errors';
import type {
  ConfirmUploadRequest,
  ConfirmUploadResult,
  CopyObjectRequest,
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
export const LOCAL_UPLOAD_PATH = '__upload';
export const LOCAL_PRIVATE_PATH = 'private';
const TEMP_SUFFIX = '.part';

export interface PendingUpload {
  readonly visibility: Visibility;
  readonly contentType: string;
  readonly maxBytes: number;
  readonly expiresAt: number;
}

type LocalConfig = Pick<ResolvedConfig, 'cdnBaseUrl' | 'uploadMaxTtlSec' | 'signedUrlMaxTtlSec'> & {
  readonly localFs: { readonly rootDir: string; readonly baseUrl: string };
};

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** Filesystem failures become typed storage errors; the path is never part of the message. */
export const mapFsError = (error: unknown): StorageError => {
  if (isStorageError(error)) return error;
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'EACCES' || code === 'EPERM')
    return new StorageError(ERROR_CODES.ACCESS_DENIED, 'Local storage access denied', {
      cause: error,
    });
  return new StorageError(ERROR_CODES.UNAVAILABLE, 'Local storage failed', {
    cause: error,
    details: { fsCode: code },
  });
};

/** Dev storage on the local disk: `<rootDir>/<PUBLIC|PRIVATE>/<key>`. Production config refuses it. */
export class LocalFsStorage implements StorageProvider {
  private readonly pending = new Map<string, PendingUpload>();
  private readonly secret = randomBytes(32);

  constructor(
    private readonly config: LocalConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  pathOf(visibility: Visibility, key: string): string {
    assertKey(key);
    return join(this.config.localFs.rootDir, visibility, ...key.split('/'));
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget> {
    assertUploadRequest(request, this.config.uploadMaxTtlSec);
    const expiresAt = new Date(this.now().getTime() + request.expiresInSec * MS_PER_SECOND);
    this.pending.set(request.key, {
      visibility: request.visibility,
      contentType: request.contentType,
      maxBytes: request.maxBytes,
      expiresAt: expiresAt.getTime(),
    });
    return Promise.resolve({
      url: `${this.config.localFs.baseUrl}/${LOCAL_UPLOAD_PATH}/${encodeKey(request.key)}`,
      method: UPLOAD_METHOD,
      headers: { [CONTENT_TYPE_HEADER]: request.contentType },
      expiresAt,
    });
  }

  /** Used by the HTTP helper: the valid, unexpired upload permission for a key. */
  pendingUpload(key: string): PendingUpload | undefined {
    const upload = this.pending.get(key);
    return upload && upload.expiresAt > this.now().getTime() ? upload : undefined;
  }

  /** Used by the HTTP helper: stores the uploaded bytes (atomic rename). */
  async store(visibility: Visibility, key: string, body: Buffer): Promise<void> {
    const target = this.pathOf(visibility, key);
    const temp = `${target}${TEMP_SUFFIX}`;
    try {
      await mkdir(dirname(target), { recursive: true });
      await rm(this.pathOf(visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC', key), { force: true });
      const handle = await open(temp, 'w');
      try {
        await handle.writeFile(body);
      } finally {
        await handle.close();
      }
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true }).catch(() => undefined);
      throw mapFsError(error);
    }
  }

  async confirmUpload(request: ConfirmUploadRequest): Promise<ConfirmUploadResult> {
    assertConfirmRequest(request);
    const path = this.pathOf(request.visibility, request.key);
    try {
      const { size } = await stat(path);
      const handle = await open(path, 'r');
      let head: Buffer;
      try {
        const buffer = Buffer.alloc(Math.min(size, MAGIC_BYTES_LENGTH));
        await handle.read(buffer, 0, buffer.length, 0);
        head = buffer;
      } finally {
        await handle.close();
      }
      const reason = judgeUpload(size, head, request.contentType, request.maxBytes);
      if (reason) {
        await this.delete([request.key]);
        return { status: 'REJECTED', reason };
      }
      return { status: 'CONFIRMED', size, contentType: request.contentType };
    } catch (error) {
      if (isMissing(error)) return { status: 'REJECTED', reason: 'NOT_FOUND' };
      throw mapFsError(error);
    }
  }

  getPublicUrl(key: string): string {
    assertKey(key);
    return `${this.config.cdnBaseUrl}/${encodeKey(key)}`;
  }

  async getSignedUrl(request: SignedUrlRequest): Promise<string> {
    assertSignedRequest(request, this.config.signedUrlMaxTtlSec);
    const expires = this.now().getTime() + request.expiresInSec * MS_PER_SECOND;
    const signature = this.sign(request.key, expires);
    return Promise.resolve(
      `${this.config.localFs.baseUrl}/${LOCAL_PRIVATE_PATH}/${encodeKey(request.key)}?expires=${String(expires)}&signature=${signature}`,
    );
  }

  /** Used by the HTTP helper: is this signed link genuine and unexpired? */
  verifySignature(key: string, expires: number, signature: string): boolean {
    if (!Number.isSafeInteger(expires) || expires <= this.now().getTime()) return false;
    const expected = Buffer.from(this.sign(key, expires));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  async read(key: string): Promise<Buffer | null> {
    assertKey(key);
    for (const visibility of ['PUBLIC', 'PRIVATE'] as const) {
      try {
        return await readFile(this.pathOf(visibility, key));
      } catch (error) {
        if (!isMissing(error)) throw mapFsError(error);
      }
    }
    return null;
  }

  /** Visibility the object is stored under, if any. */
  async locate(key: string): Promise<Visibility | undefined> {
    for (const visibility of ['PUBLIC', 'PRIVATE'] as const) {
      try {
        await stat(this.pathOf(visibility, key));
        return visibility;
      } catch (error) {
        if (!isMissing(error)) throw mapFsError(error);
      }
    }
    return undefined;
  }

  async write(request: WriteObjectRequest): Promise<void> {
    assertWriteRequest(request);
    await this.store(request.visibility, request.key, request.body);
  }

  async delete(keys: readonly string[]): Promise<void> {
    keys.forEach(assertKey);
    try {
      for (const key of keys) {
        this.pending.delete(key);
        await rm(this.pathOf('PUBLIC', key), { force: true });
        await rm(this.pathOf('PRIVATE', key), { force: true });
      }
    } catch (error) {
      throw mapFsError(error);
    }
  }

  async copy(request: CopyObjectRequest): Promise<void> {
    assertCopyRequest(request);
    let body: Buffer;
    try {
      body = await readFile(this.pathOf(request.visibility, request.fromKey));
    } catch (error) {
      if (isMissing(error))
        throw new StorageError(ERROR_CODES.OBJECT_NOT_FOUND, 'Source object does not exist');
      throw mapFsError(error);
    }
    await this.store(request.visibility, request.toKey, body);
  }

  /** The file system keeps no content type: `contentType` is always null here. */
  async stat(key: string): Promise<ObjectInfo | null> {
    assertKey(key);
    for (const visibility of ['PUBLIC', 'PRIVATE'] as const) {
      try {
        const info = await stat(this.pathOf(visibility, key));
        return { visibility, size: info.size, contentType: null, updatedAt: info.mtime };
      } catch (error) {
        if (!isMissing(error)) throw mapFsError(error);
      }
    }
    return null;
  }

  private sign(key: string, expires: number): string {
    return createHmac('sha256', this.secret)
      .update(`${key}\n${String(expires)}`)
      .digest('hex');
  }
}
