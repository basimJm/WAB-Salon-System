/** Admin authentication (SRV-030, Admin PRD §4, BUSINESS_DOMAIN §3.1 admins, §10 `admin.*`). */
export const ADMIN_AUTH_ROUTES = {
  base: '/auth',
  refresh: '/refresh',
  logout: '/logout',
} as const;

/** bcrypt work factor; raise it as hardware gets faster. */
export const BCRYPT_COST = 12;
/** bcrypt only reads the first 72 bytes, so longer passwords are refused instead of truncated. */
export const PASSWORD_MAX_BYTES = 72;
