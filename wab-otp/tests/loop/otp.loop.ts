/**
 * Loop test (Rules.md §13): drives precheck -> verify -> reportFailure through the whole service
 * 1 000 times across 50 phones with 20 phones in flight, on the memory store AND on a real Redis.
 * Checks: a block starts after exactly the configured count, success resets counters, no counter or
 * block key is left behind, and memory stays flat. Success proofs are real RS256 Firebase-shaped
 * tokens checked against a stubbed key endpoint.
 */
import { MemoryLimitStore } from '../../src/adapters/memory-store';
import { RedisLimitStore } from '../../src/adapters/redis-store';
import type { LimitStore, OtpProvider } from '../../src/ports';
import { createOtpService } from '../../src/service';
import {
  jwks,
  makeKey,
  NOW,
  PROJECT,
  signToken,
  stubFetch,
  type TestKey,
} from '../helpers/firebase';
import { startTestRedis, type TestRedis } from '../helpers/redis';

const PHONES = 50;
const ROUNDS = 20;
const CONCURRENCY = 20;
const LIMITS = { requestMax: 3, wrongMax: 3, blockSec: 600, requestWindowSec: 300 };
const MAX_HEAP_GROWTH_BYTES = 150 * 1024 * 1024;

const phoneOf = (index: number): string => `+96279${String(1_000_000 + index)}`;

const runRound = async (
  otp: OtpProvider,
  key: TestKey,
  phone: string,
  round: number,
): Promise<void> => {
  const base = { phone, purpose: 'LOGIN' } as const;
  const scenario = round % 3;
  if (scenario === 0) {
    for (let i = 1; i < LIMITS.wrongMax; i += 1) {
      const r = await otp.reportFailure({ ...base, reason: 'WRONG_CODE' });
      expect(r).toMatchObject({ blocked: false, attemptsRemaining: LIMITS.wrongMax - i });
    }
    const last = await otp.reportFailure({ ...base, reason: 'WRONG_CODE' });
    expect(last).toMatchObject({ blocked: true, attemptsRemaining: 0 });
    const blocked = await otp.verify({ proof: 'x', expectedPhone: phone, purpose: 'LOGIN' });
    expect(blocked).toEqual({ outcome: 'BLOCKED' });
  } else if (scenario === 1) {
    for (let i = 0; i < LIMITS.requestMax; i += 1)
      expect((await otp.precheck(base)).allowed).toBe(true);
    expect(await otp.precheck(base)).toMatchObject({ allowed: false });
  } else {
    await otp.reportFailure({ ...base, reason: 'WRONG_CODE' });
    await otp.reportFailure({ ...base, reason: 'WRONG_CODE' });
    const proof = await signToken(key, { claims: { phone_number: phone } });
    const ok = await otp.verify({ proof, expectedPhone: phone, purpose: 'LOGIN' });
    expect(ok).toEqual({ outcome: 'VERIFIED', phone });
    // success cleared the two wrong attempts: a full set of attempts is available again
    const after = await otp.reportFailure({ ...base, reason: 'EXPIRED' });
    expect(after).toEqual({ blocked: false, attemptsRemaining: LIMITS.wrongMax });
  }
};

const runLoop = async (store: LimitStore, afterwards: () => Promise<void>): Promise<void> => {
  const key = await makeKey();
  const stub = stubFetch(() => ({ body: jwks(key) }));
  const otp = createOtpService({
    environment: 'dev',
    provider: 'firebase',
    firebase: { projectId: PROJECT, fetch: stub.fetch },
    limits: LIMITS,
    now: () => NOW,
    resendAfterSec: 0,
    store,
  });
  const heapBefore = process.memoryUsage().heapUsed;
  let done = 0;
  const queue = Array.from({ length: PHONES }, (_, i) => i);
  const worker = async (): Promise<void> => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      const phone = phoneOf(next);
      for (let round = 0; round < ROUNDS; round += 1) {
        await runRound(otp, key, phone, round);
        await otp.resetLimits(phone);
        done += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  expect(done).toBe(PHONES * ROUNDS);
  expect(stub.calls()).toBe(1);
  await afterwards();
  expect(process.memoryUsage().heapUsed - heapBefore).toBeLessThan(MAX_HEAP_GROWTH_BYTES);
  await otp.close();
};

describe('otp loop', () => {
  it(`${String(PHONES * ROUNDS)} flows on the memory store leave nothing behind`, async () => {
    const store = new MemoryLimitStore();
    await runLoop(store, async () => {
      for (let i = 0; i < PHONES; i += 1) {
        expect(await store.countOf(`otp:wrong:${phoneOf(i)}`)).toBe(0);
        expect(await store.blockTtlMs(`otp:block:${phoneOf(i)}`)).toBe(0);
      }
    });
  });

  describe('on a real Redis', () => {
    let redis: TestRedis;
    beforeAll(async () => {
      redis = await startTestRedis();
      await redis.client.flushdb();
    });
    afterAll(async () => {
      await redis.stop();
    });

    it(`${String(PHONES * ROUNDS)} flows stay consistent and leave no key behind`, async () => {
      await runLoop(new RedisLimitStore(redis.client), async () => {
        // Every phone was reset after its last round: no counter, block or cooldown key is left.
        expect(await redis.client.keys('*')).toEqual([]);
      });
    });
  });
});
