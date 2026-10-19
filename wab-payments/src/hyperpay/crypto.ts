import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ERROR_CODES } from '../constants/codes';
import { HEX_PATTERN, HYPERPAY_WEBHOOK } from '../constants/hyperpay';
import { PaymentSdkError } from '../errors';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

export interface EncryptedNotification {
  /** Hex ciphertext: the HTTP body. */
  readonly body: string;
  /** Hex IV: `X-Initialization-Vector`. */
  readonly iv: string;
  /** Hex authentication tag: `X-Authentication-Tag`. */
  readonly tag: string;
}

const invalid = (reason: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.WEBHOOK_INVALID, reason);

/** HyperPay's notification scheme, used by the local mock gateway and tests. */
export const encryptNotification = (
  plain: string,
  keyHex: string,
  iv: Buffer = randomBytes(IV_BYTES),
): EncryptedNotification => {
  const cipher = createCipheriv(ALGORITHM, Buffer.from(keyHex, 'hex'), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    body: body.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
};

/**
 * Decrypts a HyperPay notification (AES-256-GCM). A wrong key, IV, tag or a tampered body fails the
 * authentication tag check, so a successful decrypt also authenticates the sender.
 */
export const decryptNotification = (input: EncryptedNotification, keyHex: string): string => {
  const { body, iv, tag } = input;
  if (!HEX_PATTERN.test(body.trim()) || !HEX_PATTERN.test(iv) || !HEX_PATTERN.test(tag)) {
    throw invalid('notification is not hex encoded');
  }
  const tagBytes = Buffer.from(tag, 'hex');
  if (tagBytes.length !== HYPERPAY_WEBHOOK.authTagBytes) throw invalid('bad authentication tag');
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(keyHex, 'hex'),
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(tagBytes);
    const plain = Buffer.concat([
      decipher.update(Buffer.from(body.trim(), 'hex')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch (cause) {
    throw new PaymentSdkError(ERROR_CODES.WEBHOOK_INVALID, 'notification failed authentication', {
      cause,
    });
  }
};
