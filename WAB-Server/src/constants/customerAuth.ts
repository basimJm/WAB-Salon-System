/** Customer authentication routes and rules (SRV-028, Customer PRD S11–S13, S22). */
export const CUSTOMER_AUTH_ROUTES = {
  base: '/auth',
  checkPhone: '/check-phone',
  login: '/login',
  register: '/register',
  refresh: '/refresh',
  logout: '/logout',
  changePhone: '/change-phone',
} as const;

/** `check-phone` is asked before the OTP is sent, only for these modes. */
export const PHONE_CHECK_PURPOSES = ['LOGIN', 'REGISTER'] as const;
export type PhoneCheckPurpose = (typeof PHONE_CHECK_PURPOSES)[number];

/** Upper bound on the Firebase ID token (a JWT) the app sends. */
export const ID_TOKEN_MAX_LENGTH = 4096;
export const REFRESH_TOKEN_MAX_LENGTH = 64;

/** Detail code for a well-formed request field that names something unknown (country, city, area). */
export const FIELD_INVALID_CODE = 'invalid_reference';
