export { FakeOtpProvider, type FakeOtpOptions } from './fake';
export { createSdkOtp, mapOtpSdkError, toProofResult, type SdkOtpDeps } from './sdk';
export {
  createWhatsAppOtpProvider,
  WhatsAppOtpConfigError,
  type WhatsAppOtpDeps,
} from './whatsapp';
export type {
  OtpCodeInput,
  OtpCodeResult,
  OtpCodeRules,
  OtpProvider,
  OtpSendInput,
  OtpVerifyInput,
  OtpVerifyResult,
} from './types';
