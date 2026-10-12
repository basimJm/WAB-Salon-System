import { PUSH_MAX_TOKENS_PER_REQUEST } from '../src/constants/providers';
import { FakeNotifier } from '../src/providers/notifier';
import type { PushMessage, PushRequest } from '../src/providers/notifier';

const KEY = 'booking-1234:push:1';
const visible: PushMessage = {
  app: 'MERCHANT',
  kind: 'VISIBLE',
  title: 'طلب حجز جديد',
  body: 'لديك طلب حجز جديد',
  data: { bookingId: '64b7f0f2a1b2c3d4e5f60718' },
  priority: 'HIGH',
  interruption: 'TIME_SENSITIVE',
  actionCategory: 'BOOKING_REQUEST',
  androidFullScreenIntent: true,
};
const push = (over: Partial<PushRequest> = {}): PushRequest => ({
  target: { tokens: ['token-a', 'token-b'] },
  message: visible,
  idempotencyKey: KEY,
  ...over,
});
const email = {
  to: ['admin@example.com'],
  subject: 'New salon application',
  text: 'A salon applied.',
  idempotencyKey: 'email:salon-1:new',
};

describe('fake notifier push', () => {
  it('delivers to every token and reports per-token results in order', async () => {
    const notifier = new FakeNotifier();
    const result = await notifier.sendPush(push());
    expect(result).toEqual({
      tokens: [
        { token: 'token-a', result: 'SENT' },
        { token: 'token-b', result: 'SENT' },
      ],
      sent: 2,
      invalidTokens: [],
    });
    expect(notifier.pushes).toHaveLength(1);
  });

  it('lists unregistered tokens for cleanup and counts failures separately', async () => {
    const notifier = new FakeNotifier();
    notifier.markTokenInvalid('token-a');
    notifier.markTokenFailing('token-b');
    const result = await notifier.sendPush(
      push({ target: { tokens: ['token-a', 'token-b', 'token-c'] } }),
    );
    expect(result.invalidTokens).toEqual(['token-a']);
    expect(result.tokens.map((t) => t.result)).toEqual(['INVALID_TOKEN', 'FAILED', 'SENT']);
    expect(result.sent).toBe(1);
  });

  it('sends to a topic', async () => {
    const notifier = new FakeNotifier();
    const result = await notifier.sendPush(push({ target: { topic: 'customers-amman' } }));
    expect(result).toEqual({ tokens: [], sent: 1, invalidTokens: [] });
  });

  it('does not send the same logical notification twice', async () => {
    const notifier = new FakeNotifier();
    const first = await notifier.sendPush(push());
    const again = await notifier.sendPush(push());
    expect(again).toBe(first);
    expect(notifier.pushes).toHaveLength(1);
  });

  it('refuses to reuse a key for a different notification', async () => {
    const notifier = new FakeNotifier();
    await notifier.sendPush(push());
    await expect(
      notifier.sendPush(push({ target: { tokens: ['other-token'] } })),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it('accepts a silent data-only push', async () => {
    const notifier = new FakeNotifier();
    const result = await notifier.sendPush(
      push({
        message: { app: 'CUSTOMER', kind: 'DATA_ONLY', data: { type: 'PERMISSIONS_UPDATED' } },
      }),
    );
    expect(result.sent).toBe(2);
  });

  const tokens = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `t-${String(i)}`);

  it.each([
    ['no tokens', { target: { tokens: [] } }],
    ['too many tokens', { target: { tokens: tokens(PUSH_MAX_TOKENS_PER_REQUEST + 1) } }],
    ['a blank token', { target: { tokens: ['a', ' '] } }],
    ['a duplicate token', { target: { tokens: ['a', 'a'] } }],
    ['a bad topic', { target: { topic: 'bad topic!' } }],
    ['a bad key', { idempotencyKey: 'short' }],
    [
      'a visible push without a title',
      { message: { app: 'CUSTOMER', kind: 'VISIBLE', body: 'x' } },
    ],
    [
      'a visible push without a body',
      { message: { app: 'CUSTOMER', kind: 'VISIBLE', title: 'x' } },
    ],
    [
      'a data-only push with text',
      { message: { app: 'CUSTOMER', kind: 'DATA_ONLY', title: 'x', data: { a: 'b' } } },
    ],
    ['a data-only push without data', { message: { app: 'CUSTOMER', kind: 'DATA_ONLY' } }],
    ['a negative badge', { message: { ...visible, badge: -1 } }],
    ['a fractional badge', { message: { ...visible, badge: 1.5 } }],
  ] as const)('rejects %s', async (_label, override) => {
    const notifier = new FakeNotifier();
    await expect(notifier.sendPush(push(override as Partial<PushRequest>))).rejects.toBeInstanceOf(
      RangeError,
    );
    expect(notifier.pushes).toHaveLength(0);
  });

  it('accepts exactly the maximum number of tokens and a zero badge', async () => {
    const notifier = new FakeNotifier();
    const result = await notifier.sendPush(
      push({
        target: { tokens: tokens(PUSH_MAX_TOKENS_PER_REQUEST) },
        message: { ...visible, badge: 0 },
      }),
    );
    expect(result.sent).toBe(PUSH_MAX_TOKENS_PER_REQUEST);
  });
});

describe('fake notifier email', () => {
  it('accepts valid recipients and records the email', async () => {
    const notifier = new FakeNotifier();
    await expect(notifier.sendEmail(email)).resolves.toEqual({
      accepted: ['admin@example.com'],
      rejected: [],
    });
    expect(notifier.emails).toHaveLength(1);
  });

  it('splits accepted and rejected addresses', async () => {
    const notifier = new FakeNotifier();
    notifier.markAddressRejected('bad@example.com');
    const result = await notifier.sendEmail({ ...email, to: ['a@example.com', 'bad@example.com'] });
    expect(result).toEqual({ accepted: ['a@example.com'], rejected: ['bad@example.com'] });
  });

  it('is idempotent per key', async () => {
    const notifier = new FakeNotifier();
    await notifier.sendEmail(email);
    await notifier.sendEmail(email);
    expect(notifier.emails).toHaveLength(1);
    await expect(notifier.sendEmail({ ...email, subject: 'Different' })).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  it.each([
    { to: [] },
    { to: ['not-an-email'] },
    { to: Array.from({ length: 51 }, (_, i) => `u${String(i)}@example.com`) },
    { subject: ' ' },
    { text: '' },
    { idempotencyKey: 'x' },
  ])('rejects %j', async (override) => {
    await expect(new FakeNotifier().sendEmail({ ...email, ...override })).rejects.toBeInstanceOf(
      RangeError,
    );
  });
});
