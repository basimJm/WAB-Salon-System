import type { CodeStore, SmsVendor } from './index';

/** Records messages instead of sending them (dev and tests). */
export class FakeSmsVendor implements SmsVendor {
  readonly isFake = true;
  readonly sent: { to: string; body: string }[] = [];
  /** Set to make the next sends fail like a vendor outage. */
  failWith: Error | undefined;

  send(message: { to: string; body: string }): Promise<{ id: string }> {
    if (this.failWith !== undefined) return Promise.reject(this.failWith);
    this.sent.push({ ...message });
    return Promise.resolve({ id: `fake-${String(this.sent.length)}` });
  }
}

interface Entry {
  value: string;
  expiresAt: number;
}

/** Process-local code store with TTL. Refused in production. */
export class MemoryCodeStore implements CodeStore {
  readonly scope = 'local';
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (entry === undefined) return Promise.resolve(null);
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }
}
