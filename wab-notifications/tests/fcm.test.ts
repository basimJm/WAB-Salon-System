import { FcmPushChannel, type MessagingLike } from '../src/adapters/push/fcm';
import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import {
  FAST_RETRY,
  bad,
  fcmError,
  instantDeps,
  ok,
  pushRequest,
  scriptedMessaging,
  spyLogger,
  type ScriptedMessaging,
} from './helpers';

const channelFor = (
  messaging: MessagingLike,
  extra: Partial<ConstructorParameters<typeof FcmPushChannel>[0]> = {},
): { channel: FcmPushChannel; sleeps: number[]; warns: () => string[] } => {
  const { deps, sleeps } = instantDeps();
  const { logger, entries } = spyLogger();
  const channel = new FcmPushChannel({
    messaging: () => Promise.resolve(messaging),
    logger,
    retry: FAST_RETRY,
    retryDeps: deps,
    ...extra,
  });
  return {
    channel,
    sleeps,
    warns: () => entries.filter((e) => e.level === 'warn').map((e) => e.message),
  };
};

const tokens = (...names: string[]): ReturnType<typeof pushRequest> =>
  pushRequest({ target: { tokens: names } });

describe('FcmPushChannel — token pushes', () => {
  it('sends one multicast and reports per-token results', async () => {
    const messaging = scriptedMessaging([{ responses: [ok(), ok()] }]);
    const { channel } = channelFor(messaging);
    const result = await channel.send(tokens('a', 'b'));
    expect(result).toEqual({
      tokens: [
        { token: 'a', result: 'SENT' },
        { token: 'b', result: 'SENT' },
      ],
      sent: 2,
      invalidTokens: [],
    });
    expect(messaging.multicasts).toHaveLength(1);
    expect(messaging.multicasts[0]?.[0].tokens).toEqual(['a', 'b']);
    expect(messaging.multicasts[0]?.[0].notification).toEqual({ title: 'Hello', body: 'World' });
    expect(messaging.multicasts[0]?.[1]).toBe(false);
  });

  it('returns unregistered tokens so the caller can remove them', async () => {
    const messaging = scriptedMessaging([
      {
        responses: [
          ok(),
          bad('messaging/registration-token-not-registered'),
          bad('messaging/invalid-registration-token'),
        ],
      },
    ]);
    const result = await channelFor(messaging).channel.send(tokens('a', 'b', 'c'));
    expect(result.invalidTokens).toEqual(['b', 'c']);
    expect(result.sent).toBe(1);
    expect(result.tokens.map((t) => t.result)).toEqual(['SENT', 'INVALID_TOKEN', 'INVALID_TOKEN']);
  });

  it('retries only the retryable tokens with backoff', async () => {
    const messaging = scriptedMessaging([
      {
        responses: [ok(), bad('messaging/internal-error'), bad('messaging/message-rate-exceeded')],
      },
      { responses: [ok(), bad('messaging/internal-error')] },
      { responses: [ok()] },
    ]);
    const { channel, sleeps, warns } = channelFor(messaging);
    const result = await channel.send(tokens('a', 'b', 'c'));
    expect(result.sent).toBe(3);
    expect(messaging.multicasts.map((c) => c[0].tokens)).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c'],
      ['c'],
    ]);
    expect(sleeps).toEqual([10, 20]);
    expect(warns()).toEqual(['fcm.multicast.retry', 'fcm.multicast.retry']);
  });

  it('marks tokens FAILED when retries run out but others were delivered', async () => {
    const messaging = scriptedMessaging([
      { responses: [ok(), bad('messaging/internal-error')] },
      { responses: [bad('messaging/internal-error')] },
      { responses: [bad('messaging/internal-error')] },
    ]);
    const result = await channelFor(messaging).channel.send(tokens('a', 'b'));
    expect(result.tokens).toEqual([
      { token: 'a', result: 'SENT' },
      { token: 'b', result: 'FAILED' },
    ]);
    expect(result.sent).toBe(1);
  });

  it('retries call-level outages and throws the last one when nothing was delivered', async () => {
    const messaging = scriptedMessaging([
      fcmError('messaging/server-unavailable'),
      fcmError('messaging/server-unavailable'),
      fcmError('messaging/server-unavailable'),
    ]);
    await expect(channelFor(messaging).channel.send(tokens('a'))).rejects.toMatchObject({
      code: ERROR_CODES.VENDOR_ERROR,
      retryable: true,
    });
    expect(messaging.multicasts).toHaveLength(3);
  });

  it('recovers from a call-level outage on a later attempt', async () => {
    const messaging = scriptedMessaging([
      fcmError('messaging/server-unavailable'),
      { responses: [ok()] },
    ]);
    const result = await channelFor(messaging).channel.send(tokens('a'));
    expect(result.sent).toBe(1);
  });

  it('fails fast on non-retryable call errors (bad credentials)', async () => {
    const messaging = scriptedMessaging([fcmError('messaging/authentication-error')]);
    await expect(channelFor(messaging).channel.send(tokens('a'))).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
    });
    expect(messaging.multicasts).toHaveLength(1);
  });

  it('fails fast when a token answer reveals bad credentials', async () => {
    const messaging = scriptedMessaging([{ responses: [bad('messaging/third-party-auth-error')] }]);
    await expect(channelFor(messaging).channel.send(tokens('a'))).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
    });
  });

  it('throws PAYLOAD_INVALID when every token is refused for the payload', async () => {
    const messaging = scriptedMessaging([
      { responses: [bad('messaging/invalid-argument'), bad('messaging/invalid-argument')] },
    ]);
    await expect(channelFor(messaging).channel.send(tokens('a', 'b'))).rejects.toMatchObject({
      code: ERROR_CODES.PAYLOAD_INVALID,
      retryable: false,
    });
  });

  it('treats the malformed-token answer as an invalid token, not a payload error', async () => {
    const malformed = {
      success: false,
      error: {
        code: 'messaging/invalid-argument',
        message: 'The registration token is not a valid FCM registration token',
      },
    } as const;
    const messaging = scriptedMessaging([{ responses: [malformed, malformed] }]);
    const result = await channelFor(messaging).channel.send(tokens('a', 'b'));
    expect(result.invalidTokens).toEqual(['a', 'b']);
    expect(result.sent).toBe(0);
  });

  it('marks only the offending token FAILED when just some are refused for the payload', async () => {
    const messaging = scriptedMessaging([{ responses: [ok(), bad('messaging/invalid-argument')] }]);
    const result = await channelFor(messaging).channel.send(tokens('a', 'b'));
    expect(result.tokens.map((t) => t.result)).toEqual(['SENT', 'FAILED']);
  });

  it('logs unknown vendor codes and marks the token FAILED without retrying', async () => {
    const messaging = scriptedMessaging([{ responses: [bad('messaging/brand-new'), ok()] }]);
    const { channel, warns } = channelFor(messaging);
    const result = await channel.send(tokens('a', 'b'));
    expect(result.tokens.map((t) => t.result)).toEqual(['FAILED', 'SENT']);
    expect(warns()).toEqual(['fcm.token.unknown_error']);
    expect(messaging.multicasts).toHaveLength(1);
  });

  it('treats a failure without an error object as an unknown failure', async () => {
    const messaging = scriptedMessaging([{ responses: [{ success: false }] }]);
    const result = await channelFor(messaging).channel.send(tokens('a'));
    expect(result.tokens).toEqual([{ token: 'a', result: 'FAILED' }]);
  });

  it('retries a response whose length does not match the batch, then gives up', async () => {
    const messaging = scriptedMessaging([
      { responses: [ok()] },
      { responses: [ok()] },
      { responses: [ok()] },
    ]);
    await expect(channelFor(messaging).channel.send(tokens('a', 'b'))).rejects.toMatchObject({
      code: ERROR_CODES.MALFORMED_RESPONSE,
    });
  });

  it('splits large sends into batches', async () => {
    const messaging = scriptedMessaging([
      { responses: [ok(), ok()] },
      { responses: [ok(), ok()] },
      { responses: [ok()] },
    ]);
    const result = await channelFor(messaging, { batchSize: 2 }).channel.send(
      tokens('a', 'b', 'c', 'd', 'e'),
    );
    expect(messaging.multicasts.map((c) => c[0].tokens.length)).toEqual([2, 2, 1]);
    expect(result.sent).toBe(5);
  });

  it('passes dryRun to FCM', async () => {
    const messaging = scriptedMessaging([{ responses: [ok()] }], []);
    await channelFor(messaging, { dryRun: true }).channel.send(tokens('a'));
    expect(messaging.multicasts[0]?.[1]).toBe(true);
  });

  it('times out a hanging vendor call with a retryable TIMEOUT', async () => {
    const hanging: MessagingLike = {
      send: () => new Promise<string>(() => undefined),
      sendEachForMulticast: () => new Promise(() => undefined),
    };
    const { channel } = channelFor(hanging, {
      timeoutMs: 5,
      retry: { ...FAST_RETRY, maxAttempts: 2 },
    });
    await expect(channel.send(tokens('a'))).rejects.toMatchObject({
      code: ERROR_CODES.TIMEOUT,
      retryable: true,
    });
  });

  it('works with the default retry policy, timeout and batch size', async () => {
    const messaging = scriptedMessaging([{ responses: [ok()] }]);
    const channel = new FcmPushChannel({
      messaging: () => Promise.resolve(messaging),
      logger: spyLogger().logger,
    });
    await expect(channel.send(tokens('a'))).resolves.toMatchObject({ sent: 1 });
  });
});

describe('FcmPushChannel — topic pushes', () => {
  const topic = pushRequest({ target: { topic: 'news.ar' } });

  it('sends to the topic', async () => {
    const messaging: ScriptedMessaging = scriptedMessaging([]);
    const result = await channelFor(messaging).channel.send(topic);
    expect(result).toEqual({ tokens: [], sent: 1, invalidTokens: [] });
    expect(messaging.sends[0]?.[0].topic).toBe('news.ar');
    expect(messaging.sends[0]?.[1]).toBe(false);
  });

  it('retries transient failures', async () => {
    const messaging = scriptedMessaging(
      [],
      [fcmError('messaging/internal-error'), 'projects/p/messages/2'],
    );
    const { channel, sleeps, warns } = channelFor(messaging);
    await channel.send(topic);
    expect(messaging.sends).toHaveLength(2);
    expect(sleeps).toEqual([10]);
    expect(warns()).toEqual(['fcm.topic.retry']);
  });

  it('does not retry credential errors', async () => {
    const messaging = scriptedMessaging([], [fcmError('messaging/authentication-error')]);
    await expect(channelFor(messaging).channel.send(topic)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
    });
    expect(messaging.sends).toHaveLength(1);
  });

  it('passes dryRun and surfaces exhausted retries', async () => {
    const messaging = scriptedMessaging([], [fcmError('x'), fcmError('x'), fcmError('x')]);
    await expect(
      channelFor(messaging, { dryRun: true }).channel.send(topic),
    ).rejects.toBeInstanceOf(NotificationError);
    expect(messaging.sends[0]?.[1]).toBe(true);
  });
});
