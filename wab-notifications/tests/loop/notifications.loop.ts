/**
 * Loop test (Rules.md §13): drives the real FCM and SMTP adapters through the notifier many times,
 * with concurrency, duplicate keys and injected transient failures, and checks exactly-once
 * delivery, correct invalid-token reporting and stable memory.
 */
import { createNotifier } from '../../src/notifier';
import type { FcmBatchResponse, MessagingLike } from '../../src/adapters/push/fcm';
import type { MailMessage, TransportLike } from '../../src/adapters/email/smtp';
import { renderEmail } from '../../src/templates';
import { FAKE_ACCOUNT, FAST_RETRY, instantDeps } from '../helpers';

const ITERATIONS = 500;
const CONCURRENCY = 20;
const TOKENS_PER_PUSH = 7;

/** Small seeded PRNG so a failing run can be reproduced. */
const prng = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
};

describe('notifications loop', () => {
  it(`delivers ${String(ITERATIONS)} push + email flows exactly once, with failures injected`, async () => {
    const random = prng(20_261_014);
    const delivered = new Map<string, number>();
    const mails = new Map<string, number>();

    const messaging: MessagingLike = {
      send: () => Promise.resolve('ok'),
      sendEachForMulticast: (message): Promise<FcmBatchResponse> => {
        // ~10% of calls fail transiently, ~10% of tokens are retryable, tokens ending in "x" are unregistered.
        if (random() < 0.1)
          return Promise.reject(
            Object.assign(new Error('boom'), { code: 'messaging/internal-error' }),
          );
        return Promise.resolve({
          responses: message.tokens.map((token) => {
            if (token.endsWith('x'))
              return {
                success: false,
                error: { code: 'messaging/registration-token-not-registered' },
              };
            if (random() < 0.1)
              return { success: false, error: { code: 'messaging/message-rate-exceeded' } };
            delivered.set(token, (delivered.get(token) ?? 0) + 1);
            return { success: true };
          }),
        });
      },
    };
    const transport: TransportLike = {
      sendMail: (mail: MailMessage) => {
        if (random() < 0.1)
          return Promise.reject(Object.assign(new Error('down'), { code: 'ECONNECTION' }));
        const key = mail.subject;
        mails.set(key, (mails.get(key) ?? 0) + 1);
        return Promise.resolve({ accepted: [...mail.to], rejected: [] });
      },
    };

    const { deps } = instantDeps();
    const notifier = createNotifier({
      environment: 'dev',
      push: {
        provider: 'fcm',
        credentials: FAKE_ACCOUNT,
        messaging: () => Promise.resolve(messaging),
      },
      email: {
        provider: 'smtp',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        smtp: { host: 'localhost' },
        transport: () => transport,
      },
      retry: { ...FAST_RETRY, maxAttempts: 6 },
      retryDeps: deps,
    });

    const before = process.memoryUsage().heapUsed;
    const flow = async (i: number): Promise<{ invalid: string[]; sent: number }> => {
      const tokens = Array.from(
        { length: TOKENS_PER_PUSH },
        (_, n) => `i${String(i)}-t${String(n)}${n === 0 ? 'x' : ''}`,
      );
      const key = `loop:push:${String(i)}`;
      const request = {
        target: { tokens },
        message: { app: 'MERCHANT' as const, kind: 'VISIBLE' as const, title: 'T', body: 'B' },
        idempotencyKey: key,
      };
      // The same request is submitted three times concurrently: it must be sent once.
      const [first] = await Promise.all([
        notifier.sendPush(request),
        notifier.sendPush(request),
        notifier.sendPush(request),
      ]);
      const mail = renderEmail({
        template: 'ALERT',
        language: i % 2 === 0 ? 'ar' : 'en',
        params: { title: `Alert ${String(i)}`, message: 'm' },
      });
      await Promise.all([
        notifier.sendEmail({
          to: ['admin@example.com'],
          ...mail,
          idempotencyKey: `loop:mail:${String(i)}`,
        }),
        notifier.sendEmail({
          to: ['admin@example.com'],
          ...mail,
          idempotencyKey: `loop:mail:${String(i)}`,
        }),
      ]);
      return { invalid: [...first.invalidTokens], sent: first.sent };
    };

    const results: { invalid: string[]; sent: number }[] = [];
    for (let start = 0; start < ITERATIONS; start += CONCURRENCY) {
      const batch = Array.from({ length: Math.min(CONCURRENCY, ITERATIONS - start) }, (_, n) =>
        flow(start + n),
      );
      results.push(...(await Promise.all(batch)));
    }

    results.forEach((result, i) => {
      expect(result.invalid).toEqual([`i${String(i)}-t0x`]);
      expect(result.sent).toBeGreaterThanOrEqual(TOKENS_PER_PUSH - 2);
    });
    // Exactly-once: no token ever received a duplicate, no email subject was sent twice.
    expect([...delivered.values()].every((count) => count === 1)).toBe(true);
    expect([...mails.values()].every((count) => count === 1)).toBe(true);
    expect(mails.size).toBe(ITERATIONS);

    await notifier.close();
    const growthMb = (process.memoryUsage().heapUsed - before) / 1024 / 1024;
    expect(growthMb).toBeLessThan(100);
  });
});
