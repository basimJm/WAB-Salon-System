import type { RequestHandler } from 'express';
import { SEARCH_ROUTE_RATE_LIMIT } from '../../../constants/search';
import {
  ROUTE_LIMIT_FAMILIES,
  type RouteLimitFamily,
  type RouteLimitNamespace,
} from '../../../constants/security';
import { UPLOAD_ROUTE_RATE_LIMIT } from '../../../constants/uploads';
import { createRateLimiter } from '../../../middlewares/rateLimit';
import type { ApiServices } from '../../services';

export interface RouteLimit {
  readonly windowMs: number;
  readonly max: number;
}

/** Store scope of one limit family in one namespace, e.g. `customer:otp`. */
export const routeLimitScope = (namespace: RouteLimitNamespace, family: RouteLimitFamily): string =>
  `${namespace}:${family}`;

/**
 * Per-IP limiter of one route family (SRV-151). With a shared store every family counts on its own
 * key, so e.g. catalog browsing cannot exhaust the OTP budget of the same IP.
 */
export const createRouteLimiter = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
  family: RouteLimitFamily,
  limit: RouteLimit,
): RequestHandler => {
  const store = services.rateLimitStoreFor?.(routeLimitScope(namespace, family));
  return createRateLimiter({ ...limit, ...(store === undefined ? {} : { store }) });
};

/** Read-mostly routes (config, content, locations, catalog, banners, profile, inbox, search…). */
export const createBrowseRouteLimiter = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
): RequestHandler =>
  createRouteLimiter(services, namespace, ROUTE_LIMIT_FAMILIES.browse, SEARCH_ROUTE_RATE_LIMIT);

/** Presign / confirm uploads: kept on the strict per-minute budget, in its own counter. */
export const createUploadRouteLimiter = (
  services: ApiServices,
  namespace: RouteLimitNamespace,
): RequestHandler =>
  createRouteLimiter(services, namespace, ROUTE_LIMIT_FAMILIES.upload, UPLOAD_ROUTE_RATE_LIMIT);
