import { ADMIN_API_PREFIX } from './http';

/**
 * Admin auth endpoints. ASSUMPTION until contracts/ (INT-01) exists: email+password starts a
 * challenge, the emailed OTP completes it (BUSINESS_DOMAIN.md §1, Admin PRD §4).
 */
export const ENDPOINTS = {
  login: `${ADMIN_API_PREFIX}/auth/login`,
  verifyOtp: `${ADMIN_API_PREFIX}/auth/verify-otp`,
  resendOtp: `${ADMIN_API_PREFIX}/auth/resend-otp`,
  refresh: `${ADMIN_API_PREFIX}/auth/refresh`,
  logout: `${ADMIN_API_PREFIX}/auth/logout`,
} as const;
