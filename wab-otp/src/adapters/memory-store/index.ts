import type { HitResult, HitSpec, LimitStore } from '../../ports';

interface Entry {
  count: number;
  expiresAt: number;
}

/**
 * Process-local `LimitStore` for dev and tests. Same semantics as the Redis store; JavaScript runs
 * each method to completion, so every operation is atomic inside one process. Refused in production.
 */
export class MemoryLimitStore implements LimitStore {
  readonly scope = 'local';
  private readonly counters = new Map<string, Entry>();
  private readonly flags = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  private liveCounter(key: string): Entry | undefined {
    const entry = this.counters.get(key);
    if (entry !== undefined && entry.expiresAt <= this.now()) {
      this.counters.delete(key);
      return undefined;
    }
    return entry;
  }

  private flagTtl(key: string): number {
    const expiresAt = this.flags.get(key);
    if (expiresAt === undefined) return 0;
    const left = expiresAt - this.now();
    if (left <= 0) {
      this.flags.delete(key);
      return 0;
    }
    return left;
  }

  hit(spec: HitSpec): Promise<HitResult> {
    const blockLeft = this.flagTtl(spec.blockKey);
    const existing = this.liveCounter(spec.counterKey);
    if (blockLeft > 0)
      return Promise.resolve({
        allowed: false,
        blocked: true,
        count: existing?.count ?? 0,
        retryAfterMs: blockLeft,
      });
    const entry = existing ?? { count: 0, expiresAt: this.now() + spec.windowMs };
    entry.count += 1;
    this.counters.set(spec.counterKey, entry);
    if (spec.blockMs > 0) {
      if (entry.count >= spec.limit) {
        this.flags.set(spec.blockKey, this.now() + spec.blockMs);
        this.counters.delete(spec.counterKey);
        return Promise.resolve({
          allowed: true,
          blocked: true,
          count: entry.count,
          retryAfterMs: spec.blockMs,
        });
      }
      return Promise.resolve({
        allowed: true,
        blocked: false,
        count: entry.count,
        retryAfterMs: entry.expiresAt - this.now(),
      });
    }
    return Promise.resolve({
      allowed: entry.count <= spec.limit,
      blocked: false,
      count: entry.count,
      retryAfterMs: entry.expiresAt - this.now(),
    });
  }

  blockTtlMs(blockKey: string): Promise<number> {
    return Promise.resolve(this.flagTtl(blockKey));
  }

  startCooldown(key: string, ms: number): Promise<{ started: boolean; retryAfterMs: number }> {
    const left = this.flagTtl(key);
    if (left > 0) return Promise.resolve({ started: false, retryAfterMs: left });
    this.flags.set(key, this.now() + ms);
    return Promise.resolve({ started: true, retryAfterMs: ms });
  }

  reset(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.counters.delete(key);
      this.flags.delete(key);
    }
    return Promise.resolve();
  }
}
