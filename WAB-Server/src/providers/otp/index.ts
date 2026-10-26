export { FakeOtpProvider, type FakeOtpOptions } from './fake';
export { createSdkOtp, mapOtpSdkError, toProofResult, type SdkOtpDeps } from './sdk';
export {
  ArqamOtpConfigError,
  createArqamChannelFromSettings,
  createArqamOtpProvider,
  reportArqamAccount,
  type ArqamOtpDeps,
  type ArqamOtpProvider,
} from './arqam';
export type {
  OtpCodeInput,
  OtpCodeResult,
  OtpCodeRules,
  OtpProvider,
  OtpSendInput,
  OtpVerifyInput,
  OtpVerifyResult,
} from './types';
