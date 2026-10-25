/** Merchant member authentication routes (SRV-029, Merchant PRD §4.4, M02, M03). */
export const MERCHANT_AUTH_ROUTES = {
  base: '/auth',
  checkPhone: '/check-phone',
  login: '/login',
  refresh: '/refresh',
  logout: '/logout',
  changePhone: '/change-phone',
} as const;
/** A member's own account (SRV-129, Merchant PRD M25). */
export const MERCHANT_ME_ROUTES = { base: '/me', leave: '/leave' } as const;
/** Free text the owner may add to a salon deletion request. */
export const DELETION_REQUEST_NOTE_MAX_LENGTH = 500;
