import { z } from 'zod';
import { DEFAULT_DIRECTORY } from '../constants/defaults';
import type { RedisLike } from '../idempotency';

export interface DirectoryEntry {
  /** The gateway's id of the captured payment (refunds are made against it). */
  readonly paymentId: string;
  readonly reference?: string;
}

/**
 * Remembers which gateway payment belongs to a checkout. A refund can come days after the
 * checkout stopped being queryable, so the mapping outlives it. Production must inject a shared
 * store (Redis); the memory one is per-process.
 */
export interface SessionDirectory {
  put(sessionId: string, entry: DirectoryEntry): Promise<void>;
  get(sessionId: string): Promise<DirectoryEntry | undefined>;
  /** Reverse lookup: the checkout of a payment. */
  sessionOf(paymentId: string): Promise<string | undefined>;
}

export class MemorySessionDirectory implements SessionDirectory {
  private readonly bySession = new Map<string, DirectoryEntry>();
  private readonly byPayment = new Map<string, string>();

  put(sessionId: string, entry: DirectoryEntry): Promise<void> {
    this.bySession.set(sessionId, entry);
    this.byPayment.set(entry.paymentId, sessionId);
    return Promise.resolve();
  }

  get(sessionId: string): Promise<DirectoryEntry | undefined> {
    return Promise.resolve(this.bySession.get(sessionId));
  }

  sessionOf(paymentId: string): Promise<string | undefined> {
    return Promise.resolve(this.byPayment.get(paymentId));
  }
}

const entrySchema = z.object({ paymentId: z.string().min(1), reference: z.string().optional() });

/** Shared directory on Redis (any client with get/set-with-expiry). */
export class RedisSessionDirectory implements SessionDirectory {
  constructor(
    private readonly redis: RedisLike,
    private readonly ttlSec: number = DEFAULT_DIRECTORY.ttlSec,
    private readonly keyPrefix: string = DEFAULT_DIRECTORY.keyPrefix,
  ) {}

  async put(sessionId: string, entry: DirectoryEntry): Promise<void> {
    await this.redis.set(
      `${this.keyPrefix}session:${sessionId}`,
      JSON.stringify(entry),
      'EX',
      this.ttlSec,
    );
    await this.redis.set(
      `${this.keyPrefix}payment:${entry.paymentId}`,
      sessionId,
      'EX',
      this.ttlSec,
    );
  }

  async get(sessionId: string): Promise<DirectoryEntry | undefined> {
    const raw = await this.redis.get(`${this.keyPrefix}session:${sessionId}`);
    if (raw === null) return undefined;
    try {
      const parsed = entrySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return undefined;
      const { paymentId, reference } = parsed.data;
      return reference === undefined ? { paymentId } : { paymentId, reference };
    } catch {
      return undefined;
    }
  }

  async sessionOf(paymentId: string): Promise<string | undefined> {
    return (await this.redis.get(`${this.keyPrefix}payment:${paymentId}`)) ?? undefined;
  }
}
