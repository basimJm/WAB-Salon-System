import type { SmsVendor } from './index';

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
