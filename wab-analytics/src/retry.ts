import { DEFAULT_RETRY } from './constants/defaults';
import { isAnalyticsError } from './errors';

export interface RetryPolicy {
  readonly attempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export interface RetryHooks {
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Capped exponential backoff with jitter. */
export const backoffMs = (policy: RetryPolicy, attempt: number, random: () => number): number => {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  const ratio = DEFAULT_RETRY.jitterRatio;
  return Math.round(exponential * (1 - ratio + ratio * random()));
};

/** Runs `task`; retries only retryable `AnalyticsError`s, up to `policy.attempts` runs in total. */
export const withRetry = async <T>(
  task: () => Promise<T>,
  policy: RetryPolicy,
  hooks: RetryHooks = {},
): Promise<T> => {
  const sleep = hooks.sleep ?? realSleep;
  const random = hooks.random ?? Math.random;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      const retryable = isAnalyticsError(error) && error.retryable;
      if (!retryable || attempt >= policy.attempts) throw error;
      await sleep(backoffMs(policy, attempt, random));
    }
  }
};
