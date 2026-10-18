import { ERROR_CODES } from '../../constants/codes';
import { isOtpError, providerError } from '../../errors';
import type { HitResult, HitSpec, LimitStore } from '../../ports';

/** The slice of an ioredis client the store needs; the consumer injects its own connection. */
export interface RedisClientLike {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  pttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
}

// KEYS[1] counter, KEYS[2] block flag. ARGV: limit, windowMs, blockMs (0 = no block).
// Returns {allowed, count, blocked, retryAfterMs}. The hit that reaches the limit is allowed and
// starts the block; a counter that lost its TTL is healed so it can never be immortal.
const HIT_SCRIPT = `
local blockTtl = redis.call('pttl', KEYS[2])
if blockTtl > 0 then
  return {0, tonumber(redis.call('get', KEYS[1]) or '0'), 1, blockTtl}
end
local count = redis.call('incr', KEYS[1])
local ttl = redis.call('pttl', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('pexpire', KEYS[1], ARGV[2])
  ttl = tonumber(ARGV[2])
end
local limit = tonumber(ARGV[1])
local blockMs = tonumber(ARGV[3])
if blockMs > 0 then
  if count >= limit then
    redis.call('set', KEYS[2], '1', 'PX', blockMs)
    redis.call('del', KEYS[1])
    return {1, count, 1, blockMs}
  end
  return {1, count, 0, ttl}
end
if count > limit then return {0, count, 0, ttl} end
return {1, count, 0, ttl}`;

// KEYS[1] cooldown flag. ARGV: ms. Returns {started, retryAfterMs}.
const COOLDOWN_SCRIPT = `
if redis.call('set', KEYS[1], '1', 'PX', ARGV[1], 'NX') then
  return {1, tonumber(ARGV[1])}
end
return {0, redis.call('pttl', KEYS[1])}`;

const asNumbers = (reply: unknown, length: number): number[] => {
  if (!Array.isArray(reply) || reply.length !== length || reply.some((v) => typeof v !== 'number'))
    throw providerError(ERROR_CODES.MALFORMED_RESPONSE, 'Unexpected limit store reply', false);
  return reply as number[];
};

/** Maps connection / command failures to a retryable typed error; never leaks the server text. */
const guard = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (isOtpError(error)) throw error;
    throw providerError(ERROR_CODES.STORE_UNAVAILABLE, 'Limit store unavailable', true, error);
  }
};

/** Shared `LimitStore` for production: one Lua script per hit, so every instance sees one truth. */
export class RedisLimitStore implements LimitStore {
  readonly scope = 'shared';

  constructor(private readonly redis: RedisClientLike) {}

  hit(spec: HitSpec): Promise<HitResult> {
    return guard(async () => {
      const [allowed, count, blocked, retryAfterMs] = asNumbers(
        await this.redis.eval(
          HIT_SCRIPT,
          2,
          spec.counterKey,
          spec.blockKey,
          spec.limit,
          spec.windowMs,
          spec.blockMs,
        ),
        4,
      );
      return {
        allowed: allowed === 1,
        blocked: blocked === 1,
        count: count ?? 0,
        retryAfterMs: retryAfterMs ?? 0,
      };
    });
  }

  countOf(counterKey: string): Promise<number> {
    return guard(async () => Number((await this.redis.get(counterKey)) ?? '0'));
  }

  blockTtlMs(blockKey: string): Promise<number> {
    return guard(async () => Math.max(0, await this.redis.pttl(blockKey)));
  }

  startCooldown(key: string, ms: number): Promise<{ started: boolean; retryAfterMs: number }> {
    return guard(async () => {
      const [started, retryAfterMs] = asNumbers(
        await this.redis.eval(COOLDOWN_SCRIPT, 1, key, ms),
        2,
      );
      return { started: started === 1, retryAfterMs: Math.max(0, retryAfterMs ?? 0) };
    });
  }

  async reset(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await guard(() => this.redis.del(...keys));
  }
}
