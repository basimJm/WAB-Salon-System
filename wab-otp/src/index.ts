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
export type { FetchLike, FirebaseOptions, OtpOptions, ResolvedOptions } from './config/options';
export { maskPhone, redactFields } from './logging';
export type * from './ports';
