import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ERROR_CODES } from '../../constants/codes';
import {
  DEFAULT_OTP,
  DEFAULT_SMS,
  MS_PER_SECOND,
  type Environment,
} from '../../constants/defaults';
import { configError, isOtpError, providerError } from '../../errors';
import type { OtpPurpose } from '../../constants/defaults';
import type { ProofVerifier, VerifyInput, VerifyResult } from '../../ports';
import { assertPhone, assertPurpose } from '../../validation';

/** A real SMS vendor (Twilio, a local Jordanian gateway…) implements this; outages throw `OtpError`. */
export interface SmsVendor {
  /** A fake vendor must say so: production refuses it. */
  readonly isFake?: boolean;
  send(message: { readonly to: string; readonly body: string }): Promise<{ readonly id: string }>;
}

/** Where code hashes live until they are used or expire. Production needs a shared implementation. */
export interface CodeStore {
  readonly scope: 'local' | 'shared';
  set(key: string, value: string, ttlMs: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export interface SmsOtpOptions {
  readonly environment: Environment;
  readonly vendor: SmsVendor;
  readonly store: CodeStore;
  /** Secret for hashing codes at rest (>= 32 chars, injected from the consumer's secret store). */
  readonly secret: string;
  readonly codeLength?: number;
  readonly ttlSec?: number;
  /** Message text; `{code}` and `{minutes}` are replaced. Supplied by the consumer (localized). */
  readonly template: string;
  readonly randomDigit?: (maxExclusive: number) => number;
  readonly now?: () => number;
}

export interface SmsOtp {
  /** Generates a code, stores only its HMAC, and sends it through the vendor. */
  sendCode(input: {
    phone: string;
    purpose: OtpPurpose;
  }): Promise<{ readonly expiresInSec: number; readonly messageId: string }>;
  /** `proof` is the code the user typed. Single use; constant-time comparison. */
  verifier: ProofVerifier;
}

const keyOf = (phone: string, purpose: string): string => `otp:code:${purpose}:${phone}`;

/**
 * Skeleton of the future server-verified model (BRD OTP-11): the same `ProofVerifier` port as
 * Firebase, so nothing above it changes. No vendor is chosen yet; only the fake one exists.
 */
export const createSmsOtp = (options: SmsOtpOptions): SmsOtp => {
  if (options.secret.length < DEFAULT_SMS.minSecretLength)
    throw configError('sms secret is too short');
  if (
    options.environment === 'prod' &&
    (options.vendor.isFake === true || options.store.scope === 'local')
  )
    throw configError('A fake SMS vendor or a process-local code store is refused in production');
  const codeLength = options.codeLength ?? DEFAULT_OTP.otpLength;
  const ttlSec = options.ttlSec ?? DEFAULT_SMS.ttlSec;
  const draw = options.randomDigit ?? ((max: number): number => randomInt(0, max));
  const hash = (phone: string, purpose: string, code: string): string =>
    createHmac('sha256', options.secret).update(`${purpose}\n${phone}\n${code}`).digest('hex');

  return {
    async sendCode({ phone, purpose }) {
      assertPhone(phone, 'phone');
      assertPurpose(purpose);
      const code = String(draw(10 ** codeLength)).padStart(codeLength, '0');
      const body = options.template
        .replace('{code}', code)
        .replace('{minutes}', String(Math.ceil(ttlSec / DEFAULT_SMS.secondsPerMinute)));
      await options.store.set(
        keyOf(phone, purpose),
        hash(phone, purpose, code),
        ttlSec * MS_PER_SECOND,
      );
      try {
        const { id } = await options.vendor.send({ to: phone, body });
        return { expiresInSec: ttlSec, messageId: id };
      } catch (error) {
        await options.store.delete(keyOf(phone, purpose));
        throw isOtpError(error)
          ? error
          : providerError(ERROR_CODES.VENDOR_ERROR, 'SMS vendor failed', true, error);
      }
    },
    verifier: {
      verify: async ({ proof, expectedPhone, purpose }: VerifyInput): Promise<VerifyResult> => {
        const stored = await options.store.get(keyOf(expectedPhone, purpose));
        if (stored === null) return { outcome: 'EXPIRED' };
        const given = Buffer.from(hash(expectedPhone, purpose, proof), 'hex');
        const expected = Buffer.from(stored, 'hex');
        const match = given.length === expected.length && timingSafeEqual(given, expected);
        if (!match) return { outcome: 'INVALID_PROOF' };
        await options.store.delete(keyOf(expectedPhone, purpose));
        return { outcome: 'VERIFIED', phone: expectedPhone };
      },
    },
  };
};
