import type { Store } from 'express-rate-limit';
import type { OtpGate } from '../domain/otp/otpGate.service';
import { ExternalServiceError } from '../utils/errors';

/** Long-lived services the feature routers need. `server.ts` builds them once Redis is connected. */
export interface ApiServices {
  readonly otpGate?: OtpGate;
  /** Shared store for per-route rate limits; without it each instance counts on its own. */
  readonly rateLimitStore?: Store;
}

const unavailable = (): Promise<never> =>
  Promise.reject(new ExternalServiceError({ unavailable: true }));

/** Stands in when no Redis-backed gate exists (tests without Redis): the route answers 503, not 404. */
export const unavailableOtpGate: OtpGate = {
  request: unavailable,
  reportWrongAttempt: unavailable,
  assertNotBlocked: unavailable,
  reset: unavailable,
};
