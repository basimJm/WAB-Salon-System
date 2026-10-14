import type { PushChannel, PushRequest, PushResult } from '../../types';
import { NotificationError } from '../../errors';

/** In-memory push channel for dev and tests: records every message, outcomes are scriptable. */
export class FakePushChannel implements PushChannel {
  readonly sent: PushRequest[] = [];
  private readonly invalid = new Set<string>();
  private readonly failing = new Set<string>();
  private nextError: NotificationError | undefined;

  markTokenInvalid(token: string): void {
    this.invalid.add(token);
  }

  markTokenFailing(token: string): void {
    this.failing.add(token);
  }

  /** The next `send` rejects with this error once (simulates a provider outage). */
  failNextWith(error: NotificationError): void {
    this.nextError = error;
  }

  send(request: PushRequest): Promise<PushResult> {
    if (this.nextError !== undefined) {
      const error = this.nextError;
      this.nextError = undefined;
      return Promise.reject(error);
    }
    this.sent.push(request);
    if (!('tokens' in request.target)) {
      return Promise.resolve({ tokens: [], sent: 1, invalidTokens: [] });
    }
    const tokens = request.target.tokens.map((token) => ({
      token,
      result: this.invalid.has(token)
        ? ('INVALID_TOKEN' as const)
        : this.failing.has(token)
          ? ('FAILED' as const)
          : ('SENT' as const),
    }));
    return Promise.resolve({
      tokens,
      sent: tokens.filter((entry) => entry.result === 'SENT').length,
      invalidTokens: tokens.filter((entry) => entry.result === 'INVALID_TOKEN').map((e) => e.token),
    });
  }
}
