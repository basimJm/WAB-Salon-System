import { ERROR_CODES } from '../../constants/codes';
import { isOtpError, providerError } from '../../errors';
import type { CodeStore } from '../../ports';
import type { RedisClientLike } from '../redis-store';

// KEYS[1]; ARGV: value, ttlMs. Plain SET with expiry (a resend replaces the previous code).
const SET_SCRIPT = `redis.call('set', KEYS[1], ARGV[1], 'PX', ARGV[2]) return 1`;
// KEYS[1]; ARGV: value, ttlMs. Returns 1 when this call set the key.
const SET_NX_SCRIPT = `
if redis.call('set', KEYS[1], ARGV[1], 'PX', ARGV[2], 'NX') then return 1 end
return 0`;

const guard = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (isOtpError(error)) throw error;
    throw providerError(ERROR_CODES.STORE_UNAVAILABLE, 'Code store unavailable', true, error);
  }
};

const asFlag = (reply: unknown): boolean => {
  if (reply !== 0 && reply !== 1)
    throw providerError(ERROR_CODES.MALFORMED_RESPONSE, 'Unexpected code store reply', false);
  return reply === 1;
};

/** Shared `CodeStore` for production on the consumer's ioredis-shaped client. */
export class RedisCodeStore implements CodeStore {
  readonly scope = 'shared';

  constructor(private readonly redis: RedisClientLike) {}

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await guard(() => this.redis.eval(SET_SCRIPT, 1, key, value, ttlMs));
  }

  get(key: string): Promise<string | null> {
    return guard(() => this.redis.get(key));
  }

  delete(key: string): Promise<boolean> {
    return guard(async () => (await this.redis.del(key)) > 0);
  }

  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean> {
    return guard(async () => asFlag(await this.redis.eval(SET_NX_SCRIPT, 1, key, value, ttlMs)));
  }
}
