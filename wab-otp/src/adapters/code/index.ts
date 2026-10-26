import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { ERROR_CODES } from '../../constants/codes';
import {
  CODE_KEY_PREFIX,
  DEFAULT_CODE,
  DEFAULT_OTP,
  MS_PER_SECOND,
  type Environment,
  type OtpPurpose,
} from '../../constants/defaults';
import { configError, isOtpError, providerError, validationError } from '../../errors';
import { redactingLogger } from '../../logging';
import type { CodeStore, Logger, OtpChannel, OtpEvent, ProofVerifier } from '../../ports';
import { createProofs, type IssuedProof } from '../../proof';
import { assertPhone, assertPurpose } from '../../validation';

export interface CodeOtpOptions {
  readonly environment: Environment;
  /** Delivers the code (ARQAM, SMS, fake). A fake channel is refused in production. */
  readonly channel: OtpChannel;
  /** Code hashes and used-proof flags; a shared store is required in production. */
  readonly store: CodeStore;
  /** HMAC secret for codes at rest (>= 32 chars). */
  readonly codeSecret: string;
  /** HMAC secret of the `otpToken` (>= 32 chars, different from `codeSecret`). */
  readonly proofSecret: string;
  /** Digits per code (`otp.length`, default 6). */
  readonly codeLength?: number;
  /** Code lifetime (`otp.codeTtlSec`, default 300). */
  readonly codeTtlSec?: number;
  /** Proof lifetime (`otp.proofTtlSec`, default 600). */
  readonly proofTtlSec?: number;
  /** Dev only: every code is this value (refused in production). */
  readonly fixedCode?: string;
  /** Namespace placed in front of every store key. */
  readonly keyPrefix?: string;
  readonly logger?: Logger;
  readonly onEvent?: (event: OtpEvent) => void;
  readonly now?: () => Date;
  /** CSPRNG integer in [0, maxExclusive) (tests inject a fixed one). */
  readonly randomInt?: (maxExclusive: number) => number;
  /** Proof id generator (tests). */
  readonly newId?: () => string;
}

export interface SendCodeInput {
  readonly phone: string;
  readonly purpose: OtpPurpose;
  /** App language (`ar`, `en`); the channel maps it to its own template. */
  readonly language: string;
  /** End user's IP (optional; passed to the channel as is). */
  readonly ip?: string;
}

export interface VerifyCodeInput {
  readonly phone: string;
  readonly purpose: OtpPurpose;
  /** What the user typed. */
  readonly code: string;
}

export type CodeVerifyResult =
  | ({ readonly outcome: 'VERIFIED'; readonly phone: string } & IssuedProof)
  | { readonly outcome: 'INVALID_PROOF' | 'EXPIRED' };

export interface CodeOtp {
  /** Generates a code, stores only its HMAC (replacing an earlier code) and delivers it. */
  sendCode(
    input: SendCodeInput,
  ): Promise<{ readonly expiresInSec: number; readonly messageId: string }>;
  /** Right code: deletes it (single use) and returns a signed `otpToken`. */
  verifyCode(input: VerifyCodeInput): Promise<CodeVerifyResult>;
  /** Checks an `otpToken` (signature, expiry, phone, purpose, single use). */
  readonly proofs: ProofVerifier;
  readonly channelName: string;
}

const DIGITS = /^\d+$/;

const checkOptions = (options: CodeOtpOptions, codeLength: number): void => {
  if (options.codeSecret.length < DEFAULT_CODE.minSecretLength)
    throw configError('code secret is too short');
  if (options.codeSecret === options.proofSecret)
    throw configError('code and proof secrets must differ');
  if (!Number.isInteger(codeLength) || codeLength < 1 || codeLength > DEFAULT_CODE.maxLength)
    throw configError('codeLength is out of range');
  if (
    options.codeTtlSec !== undefined &&
    !(Number.isInteger(options.codeTtlSec) && options.codeTtlSec > 0)
  )
    throw configError('codeTtlSec must be a positive integer');
  if (
    options.fixedCode !== undefined &&
    (options.fixedCode.length !== codeLength || !DIGITS.test(options.fixedCode))
  )
    throw configError('fixedCode must have codeLength digits');
  if (options.environment !== 'prod') return;
  if (options.channel.isFake === true) throw configError('A fake channel is refused in production');
  if (options.store.scope === 'local')
    throw configError('A process-local code store is refused in production');
  if (options.fixedCode !== undefined) throw configError('fixedCode is refused in production');
};

/**
 * Server-generated OTP over any channel (BUSINESS_DOMAIN §3.1a): CSPRNG code, HMAC at rest with a
 * TTL, single use, then a signed single-use proof. Limits stay with the consumer (`createLimits`).
 */
export const createCodeOtp = (options: CodeOtpOptions): CodeOtp => {
  const codeLength = options.codeLength ?? DEFAULT_OTP.otpLength;
  checkOptions(options, codeLength);
  const ttlSec = options.codeTtlSec ?? DEFAULT_CODE.ttlSec;
  const prefix = options.keyPrefix ?? '';
  const logger = redactingLogger(options.logger);
  const channel = options.channel;
  const draw = options.randomInt ?? ((max: number): number => randomInt(0, max));
  const proofs = createProofs({
    secret: options.proofSecret,
    store: options.store,
    keyPrefix: prefix,
    ...(options.proofTtlSec === undefined ? {} : { ttlSec: options.proofTtlSec }),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.newId === undefined ? {} : { newId: options.newId }),
  });
  const keyOf = (phone: string, purpose: string): string =>
    [`${prefix}${CODE_KEY_PREFIX.code}`, purpose, phone].join(CODE_KEY_PREFIX.separator);
  const hash = (phone: string, purpose: string, code: string): Buffer =>
    createHmac(DEFAULT_CODE.hmacAlgorithm, options.codeSecret)
      .update(`${purpose}\n${phone}\n${code}`)
      .digest();
  const newCode = (): string =>
    options.fixedCode ?? String(draw(DEFAULT_CODE.radix ** codeLength)).padStart(codeLength, '0');
  const emit = (event: OtpEvent): void => {
    try {
      options.onEvent?.(event);
    } catch (error) {
      logger.warn('otp event hook failed', { error: String(error) });
    }
  };

  return {
    channelName: channel.name,
    proofs: proofs.verifier,

    async sendCode({ phone, purpose, language, ip }) {
      assertPhone(phone, 'phone');
      assertPurpose(purpose);
      if (typeof language !== 'string' || language === '')
        throw validationError('language must be a non-empty string');
      const code = newCode();
      const key = keyOf(phone, purpose);
      await options.store.set(
        key,
        hash(phone, purpose, code).toString(DEFAULT_CODE.hashEncoding),
        ttlSec * MS_PER_SECOND,
      );
      try {
        const { id } = await channel.send({
          to: phone,
          code,
          language,
          purpose,
          ttlSec,
          ...(ip === undefined ? {} : { ip }),
        });
        logger.info('otp code sent', { channel: channel.name, purpose, phone });
        emit({ type: 'send', channel: channel.name, purpose, delivered: true });
        return { expiresInSec: ttlSec, messageId: id };
      } catch (error) {
        await options.store.delete(key);
        const wrapped = isOtpError(error)
          ? error
          : providerError(ERROR_CODES.VENDOR_ERROR, 'OTP channel failed', true, error);
        logger.warn('otp code not sent', { channel: channel.name, error: wrapped.code, phone });
        emit({
          type: 'send',
          channel: channel.name,
          purpose,
          delivered: false,
          errorCode: wrapped.code,
        });
        throw wrapped;
      }
    },

    async verifyCode({ phone, purpose, code }) {
      assertPhone(phone, 'phone');
      assertPurpose(purpose);
      if (typeof code !== 'string') throw validationError('code must be a string');
      const key = keyOf(phone, purpose);
      const stored = await options.store.get(key);
      if (stored === null) return { outcome: 'EXPIRED' };
      const given = hash(phone, purpose, code);
      const expected = Buffer.from(stored, DEFAULT_CODE.hashEncoding);
      if (given.length !== expected.length || !timingSafeEqual(given, expected))
        return { outcome: 'INVALID_PROOF' };
      // Only the caller that removes the code wins; a concurrent duplicate sees it gone.
      if (!(await options.store.delete(key))) return { outcome: 'EXPIRED' };
      return { outcome: 'VERIFIED', phone, ...proofs.issue({ phone, purpose }) };
    },
  };
};
