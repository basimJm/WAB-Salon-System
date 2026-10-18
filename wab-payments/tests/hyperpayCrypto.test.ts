import { createCipheriv } from 'node:crypto';
import { ERROR_CODES } from '../src/constants/codes';
import { PaymentSdkError } from '../src/errors';
import { decryptNotification, encryptNotification } from '../src/hyperpay/crypto';

const KEY = '0123456789abcdef'.repeat(4);
const OTHER_KEY = 'fedcba9876543210'.repeat(4);
const PLAIN = JSON.stringify({ type: 'PAYMENT', payload: { id: 'p1', amount: '12.500' } });

const codeOf = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return error instanceof PaymentSdkError ? error.code : 'other';
  }
  return undefined;
};

describe('notification crypto', () => {
  it('round-trips with a random IV', () => {
    const sealed = encryptNotification(PLAIN, KEY);
    expect(sealed.iv).toHaveLength(24);
    expect(sealed.tag).toHaveLength(32);
    expect(decryptNotification(sealed, KEY)).toBe(PLAIN);
    expect(encryptNotification(PLAIN, KEY).body).not.toBe(sealed.body);
  });
  it('matches an independent AES-256-GCM implementation', () => {
    const iv = Buffer.alloc(12, 7);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(KEY, 'hex'), iv);
    const body = Buffer.concat([cipher.update('hello', 'utf8'), cipher.final()]).toString('hex');
    const sealed = encryptNotification('hello', KEY, iv);
    expect(sealed.body).toBe(body);
    expect(sealed.tag).toBe(cipher.getAuthTag().toString('hex'));
  });
  it('tolerates surrounding whitespace in the body', () => {
    const sealed = encryptNotification(PLAIN, KEY);
    expect(decryptNotification({ ...sealed, body: `${sealed.body}\n` }, KEY)).toBe(PLAIN);
  });
  it.each([
    ['wrong key', (s: ReturnType<typeof encryptNotification>) => ({ s, key: OTHER_KEY })],
    [
      'tampered body',
      (s: ReturnType<typeof encryptNotification>) => ({
        s: { ...s, body: `00${s.body.slice(2)}` },
        key: KEY,
      }),
    ],
    [
      'tampered tag',
      (s: ReturnType<typeof encryptNotification>) => ({
        s: { ...s, tag: '0'.repeat(32) },
        key: KEY,
      }),
    ],
    [
      'wrong iv',
      (s: ReturnType<typeof encryptNotification>) => ({
        s: { ...s, iv: '1'.repeat(24) },
        key: KEY,
      }),
    ],
    [
      'short iv',
      (s: ReturnType<typeof encryptNotification>) => ({ s: { ...s, iv: 'aa' }, key: KEY }),
    ],
  ])('rejects %s', (_name, mutate) => {
    const { s, key } = mutate(encryptNotification(PLAIN, KEY));
    expect(codeOf(() => decryptNotification(s, key))).toBe(ERROR_CODES.WEBHOOK_INVALID);
  });
  it.each([
    ['non-hex body', { body: 'zz' }],
    ['non-hex iv', { iv: 'zz' }],
    ['non-hex tag', { tag: 'zz' }],
    ['short tag', { tag: 'aabb' }],
  ])('rejects malformed input: %s', (_name, patch) => {
    const sealed = { ...encryptNotification(PLAIN, KEY), ...patch };
    expect(codeOf(() => decryptNotification(sealed, KEY))).toBe(ERROR_CODES.WEBHOOK_INVALID);
  });
});
