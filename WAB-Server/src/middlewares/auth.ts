import type { RequestHandler } from 'express';
import { AUTHORIZATION_HEADER, BEARER_PATTERN, type TokenScope } from '../constants/auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { verifyAccessToken } from '../utils/auth/accessToken';

/**
 * Requires a valid access token for exactly this namespace. No or bad token → 401; a valid token
 * of another scope (e.g. a customer token on an admin route) → 403. Sets `req.auth`.
 * Use per route or feature router: login and OTP pre-check routes stay public.
 */
export const requireAuth =
  (scope: TokenScope, secret: string): RequestHandler =>
  (req, _res, next) => {
    const match = BEARER_PATTERN.exec(req.get(AUTHORIZATION_HEADER) ?? '');
    if (match?.[1] === undefined) {
      next(new UnauthorizedError());
      return;
    }
    try {
      const claims = verifyAccessToken(secret, match[1]);
      if (claims.scope !== scope) {
        next(new ForbiddenError());
        return;
      }
      req.auth = claims;
      next();
    } catch (error) {
      next(error);
    }
  };
