import type { OtpChannel, OtpMessage } from '../../ports';

export const FAKE_CHANNEL_NAME = 'fake';

/** Records every code instead of delivering it (dev and tests). Refused in production. */
export class FakeOtpChannel implements OtpChannel {
  readonly name = FAKE_CHANNEL_NAME;
  readonly isFake = true;
  readonly sent: OtpMessage[] = [];
  /** Set to make the next sends fail (e.g. an `OtpError` with `OTP_DELIVERY_FAILED`). */
  failWith: Error | undefined;

  send(message: OtpMessage): Promise<{ id: string }> {
    if (this.failWith !== undefined) return Promise.reject(this.failWith);
    this.sent.push({ ...message });
    return Promise.resolve({ id: `${FAKE_CHANNEL_NAME}-${String(this.sent.length)}` });
  }

  /** The last code sent to a phone (tests read it like a user reads WhatsApp). */
  lastCode(phone: string): string | undefined {
    return this.sent.findLast((message) => message.to === phone)?.code;
  }
}
