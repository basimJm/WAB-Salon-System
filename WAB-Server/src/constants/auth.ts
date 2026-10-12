/** Access-token and authentication constants (SRV-025, CLAUDE.md §4.2). */
export const TOKEN_ISSUER = 'wab-server';
export const TOKEN_ALGORITHM = 'HS256';
/** HS256 needs a key at least as long as its 256-bit hash. */
export const JWT_SECRET_MIN_LENGTH = 32;

/** One scope per API namespace; a token is valid for exactly one (the JWT `aud`). */
export const TOKEN_SCOPES = ['customer', 'merchant', 'admin'] as const;
export type TokenScope = (typeof TOKEN_SCOPES)[number];

/** Which account type signs in to which namespace. */
export const SCOPE_BY_SUBJECT = {
  CUSTOMER: 'customer',
  MEMBER: 'merchant',
  ADMIN: 'admin',
} as const;

export const AUTHORIZATION_HEADER = 'authorization';
export const BEARER_PATTERN = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
