import { createHash } from 'node:crypto';
import { DEFAULT_IDEMPOTENCY, MS_PER_SECOND } from '../constants/defaults';
import { ERROR_CODES } from '../constants/codes';
import { NotificationError } from '../errors';

/**
 * Remembers the result per idempotency key: the same key with the same request returns the first
 * result and does not run again; the same key with a different request is a conflict; a failed
 * operation is forgotten so the caller can retry.
 */
export interface IdempotencyStore {
  run<T>(key: string, fingerprint: string, operation: () => Promise<T>): Promise<T>;
}

export const fingerprintOf = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const conflict = (): NotificationError =>
  new NotificationError(
    ERROR_CODES.IDEMPOTENCY_CONFLICT,
    'idempotency key reused with different parameters',
  );

interface MemoryEntry {
  readonly fingerprint: string;
  readonly expiresAt: number;
  readonly promise: Promise<unknown>;
}

/** In-process store (dev and tests). Not shared between instances: production must inject Redis. */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, MemoryEntry>();

  constructor(
    private readonly ttlSec: number = DEFAULT_IDEMPOTENCY.ttlSec,
    private readonly now: () => number = Date.now,
  ) {}

  run<T>(key: string, fingerprint: string, operation: () => Promise<T>): Promise<T> {
    const known = this.entries.get(key);
    if (known !== undefined && known.expiresAt > this.now()) {
      if (known.fingerprint !== fingerprint) return Promise.reject(conflict());
      return known.promise as Promise<T>;
    }
    const promise = operation();
    this.entries.set(key, {
      fingerprint,
      expiresAt: this.now() + this.ttlSec * MS_PER_SECOND,
      promise,
    });
    // A failure must not poison the key: drop it so a retry runs again.
    promise.catch(() => {
      if (this.entries.get(key)?.promise === promise) this.entries.delete(key);
    });
    return promise;
  }
}

/** The few Redis commands the store needs (satisfied by `ioredis` and `node-redis` wrappers). */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expiryMode: 'EX',
    seconds: number,
    setMode?: 'NX',
  ): Promise<string | null>;
  del(key: string): Promise<number>;
}

interface StoredRecord {
  readonly state: 'pending' | 'done';
  readonly fingerprint: string;
  readonly result?: unknown;
}

const parseRecord = (raw: string): StoredRecord => {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('state' in parsed) ||
    !('fingerprint' in parsed)
  ) {
    throw new NotificationError(ERROR_CODES.MALFORMED_RESPONSE, 'corrupt idempotency record');
  }
  return parsed as StoredRecord;
};

/** Shared store for multi-instance production. Results must be JSON-serialisable. */
export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly ttlSec: number = DEFAULT_IDEMPOTENCY.ttlSec,
    private readonly keyPrefix: string = DEFAULT_IDEMPOTENCY.keyPrefix,
  ) {}

  async run<T>(key: string, fingerprint: string, operation: () => Promise<T>): Promise<T> {
    const redisKey = `${this.keyPrefix}${key}`;
    const known = await this.redis.get(redisKey);
    if (known !== null) return this.resolveKnown(known, fingerprint) as T;

    const pending = JSON.stringify({ state: 'pending', fingerprint } satisfies StoredRecord);
    const claimed = await this.redis.set(redisKey, pending, 'EX', this.ttlSec, 'NX');
    if (claimed === null) {
      // Lost the race: somebody else claimed the key between our read and write.
      const raced = await this.redis.get(redisKey);
      if (raced === null) return this.run(key, fingerprint, operation);
      return this.resolveKnown(raced, fingerprint) as T;
    }
    try {
      const result = await operation();
      const done = JSON.stringify({ state: 'done', fingerprint, result } satisfies StoredRecord);
      await this.redis.set(redisKey, done, 'EX', this.ttlSec);
      return result;
    } catch (error) {
      await this.redis.del(redisKey);
      throw error;
    }
  }

  private resolveKnown(raw: string, fingerprint: string): unknown {
    const record = parseRecord(raw);
    if (record.fingerprint !== fingerprint) throw conflict();
    if (record.state === 'pending') {
      throw new NotificationError(
        ERROR_CODES.DUPLICATE_IN_PROGRESS,
        'a request with this idempotency key is still running',
        { retryable: true },
      );
    }
    return record.result;
  }
}
