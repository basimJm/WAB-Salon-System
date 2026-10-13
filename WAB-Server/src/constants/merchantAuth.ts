/** Merchant member authentication routes (SRV-029, Merchant PRD §4.4, M02, M03). */
export const MERCHANT_AUTH_ROUTES = {
  base: '/auth',
  checkPhone: '/check-phone',
  login: '/login',
  refresh: '/refresh',
  logout: '/logout',
} as const;
