import type { Redis } from 'ioredis';
import { HOLD_FIELD_SEPARATOR } from '../../constants/availability';
import { REDIS_KEY_PREFIX } from '../../constants/redis';
import { redisKey } from '../../utils/redis/keys';
import type { BusyInterval } from './availability';

/** One held time of one staff member on one salon-local date. */
export interface Hold {
  readonly staffId: string;
  /** Civil date (`YYYY-MM-DD`) of the salon's calendar the hold lies on. */
  readonly date: string;
  readonly start: Date;
  readonly end: Date;
}

/**
 * Times reserved for a booking draft while the customer confirms and pays (§5.6 step 1). A hold
 * is a member of the sorted set `hold:<staffId>:<date>` whose score is its expiry, so an expired
 * hold stops counting by itself and nothing has to be cleaned up for correctness.
 */
export interface HoldsStore {
  /** Replaces nothing: adds the draft's holds, all expiring `ttlMs` from `nowMs`. */
  place(input: {
    draftId: string;
    holds: readonly Hold[];
    ttlMs: number;
    nowMs: number;
  }): Promise<void>;
  /** Frees the draft's holds (payment done, draft deleted or changed). */
  release(input: { draftId: string; holds: readonly Hold[] }): Promise<void>;
  /** Live holds of these staff on a date, optionally ignoring one draft's own holds. */
  busy(input: {
    staffIds: readonly string[];
    date: string;
    nowMs: number;
    exceptDraftId?: string | undefined;
  }): Promise<BusyInterval[]>;
}

const memberOf = (draftId: string, hold: Hold): string =>
  [draftId, String(hold.start.getTime()), String(hold.end.getTime())].join(HOLD_FIELD_SEPARATOR);

const keyOf = (hold: Pick<Hold, 'staffId' | 'date'>): string =>
  redisKey(REDIS_KEY_PREFIX.hold, hold.staffId, hold.date);

export const createHoldsStore = (redis: Redis): HoldsStore => ({
  async place({ draftId, holds, ttlMs, nowMs }) {
    if (holds.length === 0) return;
    const expiresAt = nowMs + ttlMs;
    const pipeline = redis.multi();
    for (const hold of holds) {
      const key = keyOf(hold);
      pipeline.zadd(key, expiresAt, memberOf(draftId, hold));
      // All holds share one lifetime, so the newest hold also decides when the key goes away.
      pipeline.pexpire(key, ttlMs);
    }
    await pipeline.exec();
  },

  async release({ draftId, holds }) {
    if (holds.length === 0) return;
    const pipeline = redis.multi();
    for (const hold of holds) pipeline.zrem(keyOf(hold), memberOf(draftId, hold));
    await pipeline.exec();
  },

  async busy({ staffIds, date, nowMs, exceptDraftId }) {
    if (staffIds.length === 0) return [];
    const pipeline = redis.pipeline();
    for (const staffId of staffIds) {
      pipeline.zrangebyscore(keyOf({ staffId, date }), `(${String(nowMs)}`, '+inf');
    }
    const replies = (await pipeline.exec()) ?? [];
    const out: BusyInterval[] = [];
    replies.forEach(([error, members], index) => {
      if (error !== null) throw error;
      const staffId = staffIds[index];
      if (staffId === undefined || !Array.isArray(members)) return;
      for (const member of members as string[]) {
        const [draftId, start, end] = member.split(HOLD_FIELD_SEPARATOR);
        if (draftId === undefined || start === undefined || end === undefined) continue;
        if (draftId === exceptDraftId) continue;
        out.push({ staffId, start: new Date(Number(start)), end: new Date(Number(end)) });
      }
    });
    return out;
  },
});
