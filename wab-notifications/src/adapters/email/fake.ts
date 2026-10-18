import { NotificationError } from '../../errors';
import type { EmailChannel, EmailRequest, EmailResult } from '../../types';

/** In-memory mail channel for dev and tests: records every email, refusals are scriptable. */
export class FakeEmailChannel implements EmailChannel {
  readonly sent: EmailRequest[] = [];
  private readonly rejectedAddresses = new Set<string>();
  private nextError: NotificationError | undefined;

  markAddressRejected(address: string): void {
    this.rejectedAddresses.add(address.toLowerCase());
  }

  failNextWith(error: NotificationError): void {
    this.nextError = error;
  }

  send(request: EmailRequest): Promise<EmailResult> {
    if (this.nextError !== undefined) {
      const error = this.nextError;
      this.nextError = undefined;
      return Promise.reject(error);
    }
    this.sent.push(request);
    const rejected = request.to.filter((a) => this.rejectedAddresses.has(a.toLowerCase()));
    return Promise.resolve({
      accepted: request.to.filter((a) => !this.rejectedAddresses.has(a.toLowerCase())),
      rejected,
    });
  }
}
