/**
 * Loop test (Rules.md §13): drives precheck -> sendCode -> wrong codes / verifyCode -> otpToken
 * verification through the whole SDK 1 000 times across 50 phones with 20 phones in flight, on the
 * memory stores AND on a real Redis. Checks: a block starts after exactly the configured count,
 * success resets counters, a proof is single use, no counter / block / code key is left behind
 * (used-proof flags expire on their own TTL), and memory stays flat. Delivery uses the fake channel.
 */
import { createCodeOtp, type CodeOtp } from '../../src/adapters/code';
import { MemoryCodeStore } from '../../src/adapters/code-store/memory';
import { RedisCodeStore } from '../../src/adapters/code-store/redis';
import { FakeOtpChannel } from '../../src/adapters/fake/channel';
import { MemoryLimitStore } from '../../src/adapters/memory-store';
import { RedisLimitStore } from '../../src/adapters/redis-store';
import type { CodeStore, LimitStore, OtpProvider } from '../../src/ports';
import { createOtpService } from '../../src/service';
import { startTestRedis, type TestRedis } from '../helpers/redis';

const PHONES = 50;
const ROUNDS = 20;
const CONCURRENCY = 20;
const LIMITS = { requestMax: 3, wrongMax: 3, blockSec: 600, requestWindowSec: 300 };
const MAX_HEAP_GROWTH_BYTES = 150 * 1024 * 1024;
const CODE_SECRET = 'c'.repeat(32);
const PROOF_SECRET = 'p'.repeat(32);

const phoneOf = (index: number): string => `+96279${String(1_000_000 + index)}`;

interface Rig {
  readonly otp: OtpProvider;
  readonly codes: CodeOtp;
  readonly channel: FakeOtpChannel;
}

const runRound = async (
  { otp, codes, channel }: Rig,
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
    expect((await otp.precheck(base)).allowed).toBe(true);
    await codes.sendCode({ ...base, language: round % 2 === 0 ? 'ar' : 'en' });
    const wrong = await codes.verifyCode({ ...base, code: 'x' });
    expect(wrong).toEqual({ outcome: 'INVALID_PROOF' });
    await otp.reportFailure({ ...base, reason: 'WRONG_CODE' });
    const right = await codes.verifyCode({ ...base, code: channel.lastCode(phone) ?? '' });
    if (right.outcome !== 'VERIFIED') throw new Error(`expected VERIFIED, got ${right.outcome}`);
    const check = { proof: right.otpToken, expectedPhone: phone, purpose: 'LOGIN' } as const;
    expect(await otp.verify(check)).toEqual({ outcome: 'VERIFIED', phone });
    expect(await otp.verify(check)).toEqual({ outcome: 'INVALID_PROOF' });
    // success cleared the wrong attempt: a full set of attempts is available again
    const after = await otp.reportFailure({ ...base, reason: 'EXPIRED' });
    expect(after).toEqual({ blocked: false, attemptsRemaining: LIMITS.wrongMax });
  }
};

const runLoop = async (
  limitStore: LimitStore,
  codeStore: CodeStore,
  afterwards: () => Promise<void>,
): Promise<void> => {
  const channel = new FakeOtpChannel();
  const codes = createCodeOtp({
    environment: 'dev',
    channel,
    store: codeStore,
    codeSecret: CODE_SECRET,
    proofSecret: PROOF_SECRET,
  });
  const otp = createOtpService({
    environment: 'dev',
    provider: 'signed',
    proof: { secret: PROOF_SECRET, store: codeStore },
    limits: LIMITS,
    resendAfterSec: 0,
    store: limitStore,
  });
  const heapBefore = process.memoryUsage().heapUsed;
  let done = 0;
  const queue = Array.from({ length: PHONES }, (_, i) => i);
  const worker = async (): Promise<void> => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      const phone = phoneOf(next);
      for (let round = 0; round < ROUNDS; round += 1) {
        await runRound({ otp, codes, channel }, phone, round);
        await otp.resetLimits(phone);
        done += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  expect(done).toBe(PHONES * ROUNDS);
  await afterwards();
  expect(process.memoryUsage().heapUsed - heapBefore).toBeLessThan(MAX_HEAP_GROWTH_BYTES);
  await otp.close();
};

const SUCCESS_ROUNDS_PER_PHONE = Math.floor(ROUNDS / 3);

describe('otp loop', () => {
  it(`${String(PHONES * ROUNDS)} flows on the memory stores leave nothing behind`, async () => {
    const limits = new MemoryLimitStore();
    const codes = new MemoryCodeStore();
    await runLoop(limits, codes, async () => {
      for (let i = 0; i < PHONES; i += 1) {
        expect(await limits.countOf(`otp:wrong:${phoneOf(i)}`)).toBe(0);
        expect(await limits.blockTtlMs(`otp:block:${phoneOf(i)}`)).toBe(0);
        expect(await codes.get(`otp:code:LOGIN:${phoneOf(i)}`)).toBeNull();
      }
      // only the used-proof flags remain, one per successful round, each with its TTL
      expect(codes.size()).toBe(PHONES * SUCCESS_ROUNDS_PER_PHONE);
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
      await runLoop(
        new RedisLimitStore(redis.client),
        new RedisCodeStore(redis.client),
        async () => {
          const keys = await redis.client.keys('*');
          // Every phone was reset after its last round: only used-proof flags (with a TTL) are left.
          expect(keys.every((key) => key.startsWith('otp:used:'))).toBe(true);
          expect(keys).toHaveLength(PHONES * SUCCESS_ROUNDS_PER_PHONE);
          for (const key of keys.slice(0, 5))
            expect(await redis.client.pttl(key)).toBeGreaterThan(0);
        },
      );
    });
  });
});
