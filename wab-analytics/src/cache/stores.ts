import type { RedisLike, ResultCache } from '../ports';

const MS_PER_SECOND = 1000;

/** In-process cache with expiry and a size bound (oldest entry leaves first). */
export class MemoryCache implements ResultCache {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): Promise<string | undefined> {
    const entry = this.entries.get(key);
    if (entry === undefined) return Promise.resolve(undefined);
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, ttlSec: number): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlSec * MS_PER_SECOND });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
    return Promise.resolve();
  }
}

/** Shared cache in Redis (injected client, one `GET` / `SET key value EX seconds`). */
export class RedisCache implements ResultCache {
  constructor(private readonly redis: RedisLike) {}

  async get(key: string): Promise<string | undefined> {
    return (await this.redis.get(key)) ?? undefined;
  }

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSec);
  }
}
