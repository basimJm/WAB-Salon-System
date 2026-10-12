/** Security middleware constants (SRV-007). Tunable limits move to settings with SRV-017. */
export const CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
export const CORS_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'Accept-Language',
  'X-Request-Id',
  'X-App-Version',
] as const;
export const CORS_EXPOSED_HEADERS = ['X-Request-Id'] as const;
export const CORS_MAX_AGE_SEC = 600;

/** Global per-IP request budget. Stricter limits (OTP, login, payments) use `createRateLimiter`. */
export const GLOBAL_RATE_LIMIT = { windowMs: 60_000, max: 300 } as const;
export const RATE_LIMIT_HEADER_DRAFT = 'draft-7';

/** Keys that could be used for NoSQL operator injection or prototype pollution are dropped. */
export const FORBIDDEN_KEY_PREFIX = '$';
export const FORBIDDEN_KEY_CHARACTER = '.';
export const PROTOTYPE_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);
export const MAX_SANITIZE_DEPTH = 20;

export const SCRIPT_OR_STYLE_BLOCK = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
export const HTML_COMMENT = /<!--[\s\S]*?-->/g;
export const HTML_TAG = /<\/?[a-zA-Z!][^>]*>/g;
/** Stripping repeats until stable so `<scr<script>ipt>` cannot rebuild a tag. */
export const MAX_STRIP_PASSES = 5;

export const TRUST_PROXY_HOPS_MIN = 0;
export const TRUST_PROXY_HOPS_MAX = 10;
export const DEFAULT_TRUST_PROXY_HOPS = 0;
