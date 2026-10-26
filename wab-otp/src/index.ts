export { SDK_NAME, ENVIRONMENTS, OTP_PURPOSES, VERIFY_OUTCOMES } from './constants/defaults';
export type {
  Environment,
  FailureReason,
  OtpPurpose,
  ProviderName,
  VerifyOutcome,
} from './constants/defaults';
export { ERROR_CODES, type ErrorCode } from './constants/codes';
export { OtpError, isOtpError } from './errors';
export { resolveOptions } from './config/options';
export type { OtpOptions, ResolvedOptions, SignedProofOptions } from './config/options';
export { maskPhone, redactFields } from './logging';
export type * from './ports';
export { createOtpVerifier, type OtpVerifier } from './verifier';
export { createFakeVerifier, fakeProof } from './adapters/fake';
export { FakeOtpChannel } from './adapters/fake/channel';
export { MemoryLimitStore } from './adapters/memory-store';
export { RedisLimitStore, type RedisClientLike } from './adapters/redis-store';
export { MemoryCodeStore } from './adapters/code-store/memory';
export { RedisCodeStore } from './adapters/code-store/redis';
export { FAKE_PROOF_KINDS, type FakeProofKind } from './constants/fake';
export { isE164 } from './validation';
export { createProofs, type IssuedProof, type ProofOptions, type Proofs } from './proof';
export {
  createCodeOtp,
  type CodeOtp,
  type CodeOtpOptions,
  type CodeVerifyResult,
  type SendCodeInput,
  type VerifyCodeInput,
} from './adapters/code';
export {
  createWhatsAppChannel,
  createWhatsAppOtp,
  type WhatsAppOtpOptions,
} from './adapters/whatsapp';
export type { FetchLike, WhatsAppChannelOptions } from './adapters/whatsapp/options';
export {
  createSmsChannel,
  createSmsOtp,
  type SmsChannelOptions,
  type SmsOtpOptions,
  type SmsVendor,
} from './adapters/sms';
export { FakeSmsVendor } from './adapters/sms/fake';
export { createOtpService } from './service';
export { createLimits, type Limits, type LimitsConfig } from './limits';
