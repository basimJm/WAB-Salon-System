export const OTP_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mock data source only (dev builds): the code that completes any mock login. */
export const MOCK_OTP_CODE = '123456';
export const MOCK_LATENCY_MS = 400;
export const MOCK_ADMIN = { id: 'admin-1', name: 'WAB Admin' } as const;
export const MOCK_TOKEN = 'mock-access-token';
