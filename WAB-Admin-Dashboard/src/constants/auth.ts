export const OTP_LENGTH = 6;
/** Defaults until the admin settings API supplies them (Admin PRD §4, A28). */
export const OTP_VALID_MINUTES = 10;
export const RESEND_SECONDS = 60;
export const SESSION_IDLE_MINUTES = 30;
export const MASK_CHAR = '•';
export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mock data source only (dev builds): the code that completes any mock login. */
export const MOCK_OTP_CODE = '123456';
export const MOCK_LATENCY_MS = 400;
export const MOCK_ADMIN = { id: 'admin-1', name: 'WAB Admin' } as const;
export const MOCK_TOKEN = 'mock-access-token';

/** Mock session lifetimes (dev builds): short access token so the refresh path is exercised. */
export const MOCK_ACCESS_TTL_MS = 15 * 60 * 1000;
export const MOCK_REFRESH_TTL_MS = 30 * 60 * 1000;
export const MOCK_REFRESH_PREFIX = 'mock-refresh-';
