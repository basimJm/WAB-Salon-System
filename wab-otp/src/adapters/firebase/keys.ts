import { importJWK, type JWK, type KeyLike } from 'jose';
import type { FetchLike } from '../../config/options';
import { ERROR_CODES, type ErrorCode } from '../../constants/codes';
import { DEFAULT_FIREBASE, MS_PER_SECOND } from '../../constants/defaults';
import { isOtpError, providerError } from '../../errors';
import type { Logger } from '../../ports';
import { withRetry, withTimeout, type RetryDeps, type RetryPolicy } from '../../retry';

export type VerificationKey = KeyLike | Uint8Array;

export interface KeyProviderOptions {
  readonly url: string;
  readonly fetch: FetchLike;
  readonly timeoutMs: number;
  readonly retry: RetryPolicy;
  readonly retryDeps: RetryDeps;
  readonly now: () => Date;
  readonly logger: Logger;
}

export interface KeyProvider {
  /** The public key for a token's `kid`; `null` when Google publishes no such key. */
  getKey(kid: string): Promise<VerificationKey | null>;
}

const MAX_AGE = /max-age=(\d+)/i;

/** Cache lifetime the key endpoint asks for, bounded below so a bad header cannot cause a fetch storm. */
export const keyTtlSec = (cacheControl: string | null): number => {
  const match = cacheControl === null ? null : MAX_AGE.exec(cacheControl);
  const asked = match?.[1] === undefined ? DEFAULT_FIREBASE.fallbackKeyTtlSec : Number(match[1]);
  return Math.max(DEFAULT_FIREBASE.minKeyTtlSec, asked);
};

/** Every HTTP status of the key endpoint maps to a typed, retry-aware error. */
export const statusError = (status: number): ReturnType<typeof providerError> => {
  const table: readonly (readonly [boolean, ErrorCode, boolean])[] = [
    [status === 429, ERROR_CODES.RATE_LIMITED, true],
    [status === 401 || status === 403, ERROR_CODES.AUTH_FAILED, false],
    [status === 408, ERROR_CODES.TIMEOUT, true],
    [status >= 500, ERROR_CODES.VENDOR_ERROR, true],
  ];
  const hit = table.find(([matches]) => matches);
  const [, code, retryable] = hit ?? [true, ERROR_CODES.VENDOR_ERROR, false];
  return providerError(code, `Firebase key endpoint answered ${String(status)}`, retryable);
};

interface Cached {
  readonly keys: Map<string, VerificationKey>;
  readonly expiresAt: number;
  readonly fetchedAt: number;
}

const isJwk = (value: unknown): value is JWK & { kid: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { kid?: unknown }).kid === 'string' &&
  typeof (value as { kty?: unknown }).kty === 'string';

/**
 * Caches Google's public keys for as long as `Cache-Control` allows, fetches once for concurrent
 * callers, re-fetches (at most once per minimum TTL) when a token names an unknown `kid`
 * (rotation), and keeps serving stale keys for a bounded time if the endpoint is down.
 */
export const createKeyProvider = (options: KeyProviderOptions): KeyProvider => {
  let cached: Cached | undefined;
  let inflight: Promise<Cached> | undefined;
  const nowMs = (): number => options.now().getTime();

  const download = async (): Promise<Cached> => {
    const response = await withRetry(
      async () => {
        const controller = new AbortController();
        try {
          const reply = await withTimeout(
            options.fetch(options.url, {
              signal: controller.signal,
              headers: { accept: 'application/json' },
            }),
            options.timeoutMs,
            () => providerError(ERROR_CODES.TIMEOUT, 'Firebase key endpoint timed out', true),
          );
          // Inside the retried block, so 429 / 5xx are retried and other statuses are not.
          if (reply.status !== 200) throw statusError(reply.status);
          return reply;
        } catch (error) {
          // Frees the socket on timeout / bad status; never on success (the body is read later).
          controller.abort();
          if (isOtpError(error)) throw error;
          throw providerError(
            ERROR_CODES.NETWORK_ERROR,
            'Firebase key endpoint unreachable',
            true,
            error,
          );
        }
      },
      options.retry,
      options.retryDeps,
      (attempt) => {
        options.logger.warn('retrying firebase key download', { attempt });
      },
    );
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw providerError(
        ERROR_CODES.MALFORMED_RESPONSE,
        'Firebase keys are not JSON',
        false,
        error,
      );
    }
    const list =
      typeof body === 'object' && body !== null ? (body as { keys?: unknown }).keys : undefined;
    if (!Array.isArray(list) || !list.every(isJwk) || list.length === 0)
      throw providerError(
        ERROR_CODES.MALFORMED_RESPONSE,
        'Firebase keys have an unexpected shape',
        false,
      );
    const keys = new Map<string, VerificationKey>();
    for (const jwk of list) keys.set(jwk.kid, await importJWK(jwk, DEFAULT_FIREBASE.algorithm));
    const fetchedAt = nowMs();
    return {
      keys,
      fetchedAt,
      expiresAt: fetchedAt + keyTtlSec(response.headers.get('cache-control')) * MS_PER_SECOND,
    };
  };

  const refresh = (): Promise<Cached> => {
    inflight ??= download()
      .then((fresh) => {
        cached = fresh;
        return fresh;
      })
      .finally(() => {
        inflight = undefined;
      });
    return inflight;
  };

  const usableStale = (): Cached | undefined =>
    cached !== undefined &&
    nowMs() - cached.expiresAt < DEFAULT_FIREBASE.maxStaleKeySec * MS_PER_SECOND
      ? cached
      : undefined;

  const load = async (): Promise<Cached> => {
    try {
      return await refresh();
    } catch (error) {
      const stale = usableStale();
      if (stale === undefined) throw error;
      options.logger.warn('using stale firebase keys', { reason: String(error) });
      return stale;
    }
  };

  return {
    async getKey(kid) {
      const current = cached !== undefined && cached.expiresAt > nowMs() ? cached : await load();
      const known = current.keys.get(kid);
      if (known !== undefined) return known;
      // Unknown kid: Google may have rotated. Re-fetch, but not more often than the minimum TTL.
      const tooSoon = nowMs() - current.fetchedAt < DEFAULT_FIREBASE.minKeyTtlSec * MS_PER_SECOND;
      if (tooSoon) return null;
      return (await load()).keys.get(kid) ?? null;
    },
  };
};
