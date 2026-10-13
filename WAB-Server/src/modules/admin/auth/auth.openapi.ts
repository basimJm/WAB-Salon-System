import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_AUTH_ROUTES } from '../../../constants/adminAuth';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { refreshSchema } from './auth.validation';

const sessionSchema = successResponseSchema(
  z.object({
    accessToken: z.string(),
    accessTokenExpiresAt: z.iso.datetime(),
    refreshToken: z
      .string()
      .describe('Rotates on every refresh and expires after the idle timeout without one.'),
    refreshTokenExpiresAt: z.iso.datetime(),
    admin: z.object({ id: z.string(), email: z.string() }).openapi('AdminIdentity'),
  }),
);
const emptySchema = successResponseSchema(z.null());

export const registerAdminAuthDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_AUTH_ROUTES.base}`;
  const request = {
    headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
    body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: refreshSchema } } },
  };
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_AUTH_ROUTES.refresh}`,
    tags: ['Auth'],
    summary: 'Rotate the refresh token',
    description:
      'Keeps an active session alive. A session idle for longer than `admin.sessionIdleSec` has an expired refresh token (401); reusing an old token ends the session.',
    security: [],
    request,
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Session', sessionSchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_AUTH_ROUTES.logout}`,
    tags: ['Auth'],
    summary: 'Log out',
    description: 'Revokes the refresh token. Always succeeds for a well-formed token.',
    security: [],
    request,
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Logged out', emptySchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
