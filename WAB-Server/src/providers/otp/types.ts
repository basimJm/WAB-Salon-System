import type { OtpOutcome, OtpPurpose } from '../../constants/providers';

export interface OtpVerifyInput {
  /** What the app got from the provider after the user typed the code (Firebase ID token). */
  readonly proof: string;
  /** The phone the user claims to own, in E.164. */
  readonly expectedPhone: string;
  readonly purpose: OtpPurpose;
}

/** `VERIFIED` carries the phone the provider confirmed (equal to `expectedPhone`). */
export type OtpVerifyResult =
  | { readonly outcome: Extract<OtpOutcome, 'VERIFIED'>; readonly phone: string }
  | { readonly outcome: Exclude<OtpOutcome, 'VERIFIED'> };

/**
 * Checks that a user controls a phone number (wab-otp BRD OTP-02/03/09). Only the provider's own
 * proof is checked here: request limits, blocks and counters are the backend's (SRV-027).
 * A provider that is down or misconfigured throws `ExternalServiceError`; it never returns an
 * outcome for that.
 */
export interface OtpProvider {
  verify(input: OtpVerifyInput): Promise<OtpVerifyResult>;
}
