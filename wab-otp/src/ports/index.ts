import type { FailureReason, OtpPurpose, VerifyOutcome } from '../constants/defaults';

export type Fields = Readonly<Record<string, unknown>>;

/** Injected logger; the SDK redacts every field before calling it. */
export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
}

export type OtpEvent =
  | { readonly type: 'precheck'; readonly allowed: boolean; readonly purpose: OtpPurpose }
  | { readonly type: 'verify'; readonly outcome: VerifyOutcome; readonly purpose: OtpPurpose }
  | { readonly type: 'failure'; readonly reason: FailureReason; readonly blocked: boolean }
  | { readonly type: 'provider_error'; readonly code: string };

export interface VerifyInput {
  /** What the app got from the provider after the user typed the code (Firebase ID token). */
  readonly proof: string;
  /** The phone the user claims to own, E.164. */
  readonly expectedPhone: string;
  readonly purpose: OtpPurpose;
}

export type VerifyResult =
  | { readonly outcome: 'VERIFIED'; readonly phone: string }
  | { readonly outcome: Exclude<VerifyOutcome, 'VERIFIED'> };

/** Checks one proof. Adapters (Firebase, fake, SMS vendors) implement this; outages throw `OtpError`. */
export interface ProofVerifier {
  verify(input: VerifyInput): Promise<VerifyResult>;
  close?(): Promise<void>;
}

export interface PrecheckInput {
  readonly phone: string;
  readonly purpose: OtpPurpose;
  readonly deviceId?: string;
  readonly ip?: string;
}

export interface PrecheckResult {
  readonly allowed: boolean;
  readonly otpLength: number;
  readonly resendAfterSeconds: number;
  readonly blockedUntil?: Date;
}

export interface FailureInput {
  readonly phone: string;
  readonly purpose: OtpPurpose;
  readonly reason: FailureReason;
}

export interface FailureResult {
  readonly blocked: boolean;
  readonly attemptsRemaining: number;
  readonly blockedUntil?: Date;
}

/** The stable interface every project codes against (BRD OTP-01). */
export interface OtpProvider {
  precheck(input: PrecheckInput): Promise<PrecheckResult>;
  verify(input: VerifyInput): Promise<VerifyResult>;
  reportFailure(input: FailureInput): Promise<FailureResult>;
  getConfig(): { readonly otpLength: number; readonly resendAfterSeconds: number };
  close(): Promise<void>;
}

export interface HitSpec {
  readonly counterKey: string;
  /** Limiters that share a block key share the block (requests + wrong codes). */
  readonly blockKey: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly blockMs: number;
}

export interface HitResult {
  /** This hit may go ahead. The hit that reaches the limit is allowed and starts the block. */
  readonly allowed: boolean;
  readonly blocked: boolean;
  readonly count: number;
  readonly retryAfterMs: number;
}

/** Counters, blocks and cooldowns. Must be atomic across processes in production. */
export interface LimitStore {
  /** `local` stores live in one process and are refused in production. */
  readonly scope: 'local' | 'shared';
  hit(spec: HitSpec): Promise<HitResult>;
  /** Current hits of a counter (0 when none or expired). */
  countOf(counterKey: string): Promise<number>;
  /** Remaining block time in ms, 0 when not blocked. */
  blockTtlMs(blockKey: string): Promise<number>;
  /** Only the first caller per period starts it; others learn the remaining time. */
  startCooldown(key: string, ms: number): Promise<{ started: boolean; retryAfterMs: number }>;
  reset(keys: readonly string[]): Promise<void>;
  close?(): Promise<void>;
}
