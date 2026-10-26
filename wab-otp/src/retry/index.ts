import { isOtpError } from '../errors';

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterRatio: number;
}

export interface RetryDeps {
  readonly sleep: (ms: number) => Promise<void>;
  /** Returns a number in [0, 1). */
  readonly random: () => number;
}

export const realRetryDeps: RetryDeps = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

/** Capped exponential backoff with symmetric jitter; `attempt` is the one that just failed (1-based). */
export const delayFor = (attempt: number, policy: RetryPolicy, random: () => number): number => {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  const jitter = exponential * policy.jitterRatio * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
};

export const isRetryable = (error: unknown): boolean => isOtpError(error) && error.retryable;

/** A wait the vendor asked for (`details.retryAfterMs`, e.g. ARQAM `retryAfter`), if any. */
export const hintedDelayMs = (error: unknown): number | undefined => {
  if (!isOtpError(error)) return undefined;
  const hint = error.details['retryAfterMs'];
  return typeof hint === 'number' && Number.isFinite(hint) && hint >= 0 ? hint : undefined;
};

/** Runs `operation`, retrying only errors marked retryable (never sooner than the vendor's hint). */
export const withRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
  deps: RetryDeps,
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= policy.maxAttempts || !isRetryable(error)) throw error;
      onRetry?.(attempt, error);
      const backoff = delayFor(attempt, policy, deps.random);
      await deps.sleep(Math.max(backoff, hintedDelayMs(error) ?? 0));
    }
  }
};
