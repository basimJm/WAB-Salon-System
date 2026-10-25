import { FakeEmailChannel } from '../src/adapters/email/fake';
import { FakePushChannel } from '../src/adapters/push/fake';
import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import { MemoryIdempotencyStore } from '../src/idempotency';
import { createNotifier } from '../src/notifier';
import type { NotifierEvent } from '../src/types';
import {
  FAKE_ACCOUNT,
  FAST_RETRY,
  bad,
  emailRequest,
  instantDeps,
  ok,
  pushRequest,
  scriptedMessaging,
  scriptedTransport,
  smtpError,
  spyLogger,
} from './helpers';

const fakes = (
  extra: Partial<Parameters<typeof createNotifier>[0]> = {},
): ReturnType<typeof createNotifier> =>
  createNotifier({
    environment: 'dev',
    push: { provider: 'fake' },
    email: { provider: 'fake' },
    ...extra,
  });

describe('createNotifier — validation and fakes', () => {
  it('validates requests before touching a channel', async () => {
    const notifier = fakes();
    await expect(notifier.sendPush(pushRequest({ target: { tokens: [] } }))).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(notifier.sendEmail(emailRequest({ to: ['nope'] }))).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    expect((notifier.channels.push as FakePushChannel).sent).toHaveLength(0);
    expect((notifier.channels.email as FakeEmailChannel).sent).toHaveLength(0);
  });

  it('sends through the fake channels', async () => {
    const notifier = fakes();
    await expect(notifier.sendPush(pushRequest())).resolves.toMatchObject({ sent: 2 });
    await expect(notifier.sendEmail(emailRequest())).resolves.toEqual({
      accepted: ['admin@example.com'],
      rejected: [],
    });
  });

  it('applies custom limits', async () => {
    const notifier = fakes({ limits: { maxTokens: 1, maxEmailRecipients: 1 } });
    await expect(notifier.sendPush(pushRequest())).rejects.toThrow('too many push tokens');
    await expect(
      notifier.sendEmail(emailRequest({ to: ['a@example.com', 'b@example.com'] })),
    ).rejects.toThrow('invalid recipient count');
  });

  it('throws CONFIG_INVALID at creation for bad options', () => {
    expect(() => fakes({ retry: { maxAttempts: 0 } })).toThrow('invalid notifier options');
  });
});

describe('createNotifier — idempotency', () => {
  it('sends once per key and replays the first result', async () => {
    const notifier = fakes();
    const first = await notifier.sendPush(pushRequest());
    const second = await notifier.sendPush(pushRequest());
    expect(second).toEqual(first);
    expect((notifier.channels.push as FakePushChannel).sent).toHaveLength(1);
    await notifier.sendEmail(emailRequest());
    await notifier.sendEmail(emailRequest());
    expect((notifier.channels.email as FakeEmailChannel).sent).toHaveLength(1);
  });

  it('collapses concurrent duplicates into one delivery', async () => {
    const notifier = fakes();
    await Promise.all(Array.from({ length: 20 }, () => notifier.sendPush(pushRequest())));
    expect((notifier.channels.push as FakePushChannel).sent).toHaveLength(1);
  });

  it('rejects the same key with different content', async () => {
    const notifier = fakes();
    await notifier.sendPush(pushRequest());
    await expect(
      notifier.sendPush(
        pushRequest({ message: { app: 'CUSTOMER', kind: 'VISIBLE', title: 'Other', body: 'x' } }),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.IDEMPOTENCY_CONFLICT });
  });

  it('lets the caller retry after a failure with the same key', async () => {
    const push = new FakePushChannel();
    push.failNextWith(
      new NotificationError(ERROR_CODES.NETWORK_ERROR, 'down', { retryable: true }),
    );
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'custom', channel: push },
      email: { provider: 'fake' },
    });
    await expect(notifier.sendPush(pushRequest())).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
    });
    await expect(notifier.sendPush(pushRequest())).resolves.toMatchObject({ sent: 2 });
  });

  it('uses an injected store', async () => {
    const calls: string[] = [];
    const store = {
      run: async <T>(key: string, _fp: string, operation: () => Promise<T>): Promise<T> => {
        calls.push(key);
        return operation();
      },
    };
    const notifier = fakes({ idempotency: { store } });
    await notifier.sendEmail(emailRequest());
    expect(calls).toEqual(['email:alert-1:sent']);
  });
});

describe('createNotifier — events', () => {
  it('emits sent/failed events with counts and codes only (never contents)', async () => {
    const events: NotifierEvent[] = [];
    const push = new FakePushChannel();
    push.markTokenInvalid('token-1');
    push.markTokenFailing('token-2');
    const email = new FakeEmailChannel();
    email.markAddressRejected('bad@example.com');
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'custom', channel: push },
      email: { provider: 'custom', channel: email },
      onEvent: (event) => events.push(event),
    });
    await notifier.sendPush(pushRequest());
    await notifier.sendEmail(emailRequest({ to: ['a@example.com', 'bad@example.com'] }));
    push.failNextWith(new NotificationError(ERROR_CODES.RATE_LIMITED, 'x'));
    await expect(
      notifier.sendPush(pushRequest({ idempotencyKey: 'push:other:key01' })),
    ).rejects.toBeDefined();
    email.failNextWith(new NotificationError(ERROR_CODES.AUTH_FAILED, 'x'));
    await expect(
      notifier.sendEmail(emailRequest({ idempotencyKey: 'email:other:key01' })),
    ).rejects.toBeDefined();
    expect(events).toEqual([
      { type: 'push.sent', sent: 0, invalid: 1, failed: 1 },
      { type: 'email.sent', accepted: 1, rejected: 1 },
      { type: 'push.failed', code: ERROR_CODES.RATE_LIMITED },
      { type: 'email.failed', code: ERROR_CODES.AUTH_FAILED },
    ]);
  });

  it('does not emit again for an idempotent replay', async () => {
    const events: NotifierEvent[] = [];
    const notifier = fakes({ onEvent: (event) => events.push(event) });
    await notifier.sendPush(pushRequest());
    await notifier.sendPush(pushRequest());
    expect(events).toHaveLength(1);
  });

  it('reports UNKNOWN for foreign errors and still throws them', async () => {
    const events: NotifierEvent[] = [];
    const channel = { send: () => Promise.reject(new Error('weird')) };
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'custom', channel },
      email: { provider: 'fake' },
      onEvent: (event) => events.push(event),
    });
    await expect(notifier.sendPush(pushRequest())).rejects.toThrow('weird');
    expect(events).toEqual([{ type: 'push.failed', code: 'UNKNOWN' }]);
  });

  it('survives a throwing event hook', async () => {
    const { logger, entries } = spyLogger();
    const notifier = fakes({
      logger,
      onEvent: () => {
        throw new Error('hook bug');
      },
    });
    await expect(notifier.sendPush(pushRequest())).resolves.toMatchObject({ sent: 2 });
    expect(entries.some((e) => e.message === 'notifier.hook_failed')).toBe(true);
  });
});

describe('createNotifier — FCM and SMTP wiring', () => {
  it('delivers through an injected FCM client with retries and per-token results', async () => {
    const messaging = scriptedMessaging([
      { responses: [ok(), bad('messaging/internal-error')] },
      { responses: [ok()] },
    ]);
    const { deps, sleeps } = instantDeps();
    const notifier = createNotifier({
      environment: 'dev',
      push: {
        provider: 'fcm',
        credentials: FAKE_ACCOUNT,
        messaging: () => Promise.resolve(messaging),
        dryRun: true,
        timeoutMs: 1000,
      },
      email: { provider: 'fake' },
      retry: FAST_RETRY,
      retryDeps: deps,
    });
    const result = await notifier.sendPush(pushRequest());
    expect(result.sent).toBe(2);
    expect(sleeps).toEqual([10]);
    expect(messaging.multicasts[0]?.[1]).toBe(true);
  });

  it('delivers through an injected SMTP transport and closes it', async () => {
    const transport = scriptedTransport([smtpError({ code: 'ECONNECTION' })]);
    const { deps } = instantDeps();
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'fake' },
      email: {
        provider: 'smtp',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        smtp: { host: 'localhost' },
        transport: () => transport,
      },
      retry: FAST_RETRY,
      retryDeps: deps,
    });
    await expect(notifier.sendEmail(emailRequest())).resolves.toMatchObject({
      accepted: ['admin@example.com'],
    });
    expect(transport.mails).toHaveLength(2);
    await notifier.close();
    expect(transport.closed).toBe(1);
  });

  it('delivers through the Brevo HTTP adapter with an injected fetch', async () => {
    const posted: string[] = [];
    const { deps } = instantDeps();
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'fake' },
      email: {
        provider: 'brevo',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        brevo: { apiKey: 'key', baseUrl: 'http://localhost:4010', timeoutMs: 1000 },
        fetch: (url) => {
          posted.push(url);
          return Promise.resolve({ status: 201, text: () => Promise.resolve('{}') });
        },
      },
      retry: FAST_RETRY,
      retryDeps: deps,
    });
    await expect(notifier.sendEmail(emailRequest())).resolves.toMatchObject({
      accepted: ['admin@example.com'],
    });
    expect(posted).toEqual(['http://localhost:4010/smtp/email']);
    await notifier.close();
  });

  it('builds the Brevo adapter with its defaults', () => {
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'fake' },
      email: {
        provider: 'brevo',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        brevo: { apiKey: 'key' },
      },
    });
    expect(notifier.channels.email).toBeDefined();
  });

  it('builds real vendor clients lazily without any network access', async () => {
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'fcm', credentials: FAKE_ACCOUNT },
      email: {
        provider: 'smtp',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        smtp: { host: 'localhost', port: 1025 },
      },
    });
    expect(notifier.channels.push).toBeDefined();
    await expect(notifier.close()).resolves.toBeUndefined();
  });

  it('maps a real nodemailer connection failure (nothing listening) to a retryable NETWORK_ERROR', async () => {
    const notifier = createNotifier({
      environment: 'dev',
      push: { provider: 'fake' },
      email: {
        provider: 'smtp',
        from: { name: 'WAB', address: 'no-reply@example.com' },
        smtp: { host: '127.0.0.1', port: 1, timeoutMs: 2000 },
      },
      retry: { maxAttempts: 1 },
    });
    await expect(notifier.sendEmail(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
    await notifier.close();
  });

  it('close() is idempotent', async () => {
    const closeCalls: string[] = [];
    const notifier = createNotifier({
      environment: 'dev',
      push: {
        provider: 'custom',
        channel: {
          send: () => Promise.reject(new Error('n/a')),
          close: () => {
            closeCalls.push('push');
            return Promise.resolve();
          },
        },
      },
      email: {
        provider: 'custom',
        channel: {
          send: () => Promise.reject(new Error('n/a')),
          close: () => Promise.reject(new Error('close failed')),
        },
      },
    });
    await notifier.close();
    await notifier.close();
    expect(closeCalls).toEqual(['push']);
  });

  it('uses a shared store in prod-like setups', async () => {
    const store = new MemoryIdempotencyStore();
    const make = (): ReturnType<typeof createNotifier> =>
      createNotifier({
        environment: 'prod',
        push: {
          provider: 'fcm',
          credentials: FAKE_ACCOUNT,
          messaging: () => Promise.resolve(scriptedMessaging([{ responses: [ok(), ok()] }])),
        },
        email: {
          provider: 'smtp',
          from: { name: 'WAB', address: 'no-reply@example.com' },
          smtp: { host: 'smtp.example.com', user: 'u', pass: 'p' },
          transport: () => scriptedTransport([]),
        },
        idempotency: { store },
      });
    const [a, b] = [make(), make()];
    await a.sendPush(pushRequest());
    await expect(b.sendPush(pushRequest())).resolves.toMatchObject({ sent: 2 });
  });
});
