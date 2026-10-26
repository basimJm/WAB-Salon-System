import type { CodeStore } from '../../ports';

interface Entry {
  readonly value: string;
  readonly expiresAt: number;
}

/** Process-local code store with TTL (dev and tests). Refused in production. */
export class MemoryCodeStore implements CodeStore {
  readonly scope = 'local';
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.live(key)?.value ?? null);
  }

  delete(key: string): Promise<boolean> {
    const existed = this.live(key) !== undefined;
    this.entries.delete(key);
    return Promise.resolve(existed);
  }

  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.live(key) !== undefined) return Promise.resolve(false);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    return Promise.resolve(true);
  }

  /** Number of live entries (tests and the loop test check nothing is left behind). */
  size(): number {
    for (const key of [...this.entries.keys()]) this.live(key);
    return this.entries.size;
  }

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt > this.now()) return entry;
    this.entries.delete(key);
    return undefined;
  }
}
