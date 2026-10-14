import { ERROR_CODES } from '../src/constants/codes';
import {
  DEFAULT_VALIDATION_LIMITS,
  assertEmailRequest,
  assertIdempotencyKey,
  assertPushRequest,
} from '../src/validation';
import { emailRequest, pushRequest } from './helpers';
import type { PushMessage } from '../src/types';

const limits = DEFAULT_VALIDATION_LIMITS;
const rejectsPush = (overrides: Parameters<typeof pushRequest>[0], text: string): void => {
  expect(() => {
    assertPushRequest(pushRequest(overrides), limits);
  }).toThrow(text);
};
type Loose = { -readonly [K in keyof PushMessage]?: PushMessage[K] | undefined };
/** Builds a message, dropping keys set to undefined (exactOptionalPropertyTypes). */
const message = (overrides: Loose): Parameters<typeof pushRequest>[0] => {
  const merged: Record<string, unknown> = {
    app: 'CUSTOMER',
    kind: 'VISIBLE',
    title: 't',
    body: 'b',
    ...overrides,
  };
  const defined = Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined),
  );
  return { message: defined as unknown as PushMessage };
};

describe('assertIdempotencyKey', () => {
  it('accepts 8-128 safe characters', () => {
    expect(() => {
      assertIdempotencyKey('booking:123:requested');
    }).not.toThrow();
    expect(() => {
      assertIdempotencyKey('a'.repeat(128));
    }).not.toThrow();
  });
  it.each(['short', 'has space here', 'a'.repeat(129), 'bad/slash/key', ''])(
    'rejects %p',
    (key) => {
      expect(() => {
        assertIdempotencyKey(key);
      }).toThrow('invalid idempotency key');
    },
  );
  it('throws a typed validation error', () => {
    try {
      assertIdempotencyKey('x');
      throw new Error('should not reach');
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED, retryable: false });
    }
  });
});

describe('assertPushRequest', () => {
  it('accepts a visible push to tokens, a topic push and a data-only push', () => {
    expect(() => {
      assertPushRequest(pushRequest(), limits);
    }).not.toThrow();
    expect(() => {
      assertPushRequest(pushRequest({ target: { topic: 'news.ar' } }), limits);
    }).not.toThrow();
    expect(() => {
      assertPushRequest(
        pushRequest({
          message: {
            app: 'MERCHANT',
            kind: 'DATA_ONLY',
            data: { type: 'REQUEST' },
            priority: 'HIGH',
          },
        }),
        limits,
      );
    }).not.toThrow();
  });

  it('validates the token list', () => {
    rejectsPush({ target: { tokens: [] } }, 'no push tokens');
    rejectsPush({ target: { tokens: ['a', ' '] } }, 'empty push token');
    rejectsPush({ target: { tokens: ['a', 'a'] } }, 'duplicate push token');
    rejectsPush(
      {
        target: { tokens: Array.from({ length: limits.maxTokens + 1 }, (_, i) => `t${String(i)}`) },
      },
      'too many push tokens',
    );
  });

  it('validates the topic', () => {
    rejectsPush({ target: { topic: 'bad topic!' } }, 'invalid push topic');
  });

  it('requires text for visible pushes and forbids it for data-only', () => {
    rejectsPush(message({ title: ' ' }), 'a visible push needs a title and a body');
    rejectsPush(message({ body: undefined }), 'a visible push needs a title and a body');
    rejectsPush(message({ kind: 'DATA_ONLY', data: { a: '1' } }), 'a data-only push has no text');
    rejectsPush(
      message({ kind: 'DATA_ONLY', title: undefined, body: undefined }),
      'a data-only push needs data',
    );
    rejectsPush(
      message({ kind: 'DATA_ONLY', title: undefined, body: undefined, data: {} }),
      'a data-only push needs data',
    );
  });

  it('validates enums, badge and blank options', () => {
    rejectsPush(message({ app: 'ADMIN' as never }), 'unknown push app');
    rejectsPush(message({ kind: 'LOUD' as never }), 'unknown push kind');
    rejectsPush(message({ priority: 'URGENT' as never }), 'unknown push priority');
    rejectsPush(message({ interruption: 'CRITICAL' as never }), 'unknown interruption level');
    rejectsPush(message({ badge: -1 }), 'badge must be a whole number from 0');
    rejectsPush(message({ badge: 1.5 }), 'badge must be a whole number from 0');
    rejectsPush(message({ sound: ' ' }), 'sound must not be blank');
    rejectsPush(message({ actionCategory: '' }), 'actionCategory must not be blank');
    rejectsPush(message({ androidChannelId: ' ' }), 'androidChannelId must not be blank');
    expect(() => {
      assertPushRequest(
        pushRequest(message({ badge: 0, priority: 'NORMAL', interruption: 'TIME_SENSITIVE' })),
        limits,
      );
    }).not.toThrow();
  });

  it('limits the collapse key by bytes, not characters', () => {
    rejectsPush(message({ collapseKey: 'ا'.repeat(33) }), 'collapseKey too long');
    expect(() => {
      assertPushRequest(pushRequest(message({ collapseKey: 'a'.repeat(64) })), limits);
    }).not.toThrow();
  });

  it('validates the data payload', () => {
    rejectsPush(message({ data: { a: 1 as never } }), 'data values must be strings');
    rejectsPush(message({ data: { ' ': 'x' } }), 'empty data key');
    rejectsPush(message({ data: { 'google.x': 'x' } }), 'reserved data key');
    rejectsPush(message({ data: { from: 'x' } }), 'reserved data key');
    rejectsPush(
      message({
        data: Object.fromEntries(
          Array.from({ length: limits.maxDataEntries + 1 }, (_, i) => [`k${String(i)}`, 'v']),
        ),
      }),
      'too many data entries',
    );
  });

  it('rejects a bad idempotency key first', () => {
    rejectsPush({ idempotencyKey: 'x' }, 'invalid idempotency key');
  });
});

describe('assertEmailRequest', () => {
  it('accepts a normal email', () => {
    expect(() => {
      assertEmailRequest(emailRequest(), limits);
    }).not.toThrow();
  });
  it.each([
    [{ to: [] }, 'invalid recipient count'],
    [{ to: ['not-an-email'] }, 'invalid email address'],
    [{ to: ['a@b.co\nBcc: x@y.z'] }, 'invalid email address'],
    [{ to: ['a@b.co', 'A@B.CO'] }, 'duplicate email address'],
    [{ subject: ' ' }, 'an email needs a subject and a text'],
    [{ text: '' }, 'an email needs a subject and a text'],
    [{ subject: 'Hi\r\nBcc: x@y.z' }, 'subject must be a single line'],
    [{ idempotencyKey: 'x' }, 'invalid idempotency key'],
  ])('rejects %j', (overrides, text) => {
    expect(() => {
      assertEmailRequest(emailRequest(overrides), limits);
    }).toThrow(text);
  });
  it('limits the number of recipients', () => {
    const to = Array.from(
      { length: limits.maxEmailRecipients + 1 },
      (_, i) => `u${String(i)}@example.com`,
    );
    expect(() => {
      assertEmailRequest(emailRequest({ to }), limits);
    }).toThrow('invalid recipient count');
  });
});
