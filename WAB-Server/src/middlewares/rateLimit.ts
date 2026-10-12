import type { RequestHandler, Request } from 'express';
import { rateLimit, type Store } from 'express-rate-limit';
import { RATE_LIMIT_HEADER_DRAFT } from '../constants/security';
import { RateLimitError } from '../utils/errors';

export interface RateLimiterOptions {
  readonly windowMs: number;
  readonly max: number;
  /** Defaults to in-memory (single instance); a Redis store is plugged in with SRV-014. */
  readonly store?: Store;
  readonly skip?: (req: Request) => boolean;
}

/** Per-IP limiter answering with the standard `RATE_LIMITED` (429) error envelope. */
export const createRateLimiter = ({
  windowMs,
  max,
  store,
  skip,
}: RateLimiterOptions): RequestHandler =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: RATE_LIMIT_HEADER_DRAFT,
    legacyHeaders: false,
    ...(store === undefined ? {} : { store }),
    ...(skip === undefined ? {} : { skip }),
    handler: (_req, _res, next) => {
      next(new RateLimitError());
    },
  });
