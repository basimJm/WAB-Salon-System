import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { MEMBER_ROLES, PERMISSIONS } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_AUTH_ROUTES } from '../../../constants/merchantAuth';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { checkPhoneSchema, loginSchema, refreshSchema } from './auth.validation';

/** The session profile; also the base of `GET /merchant/v1/me`. */
export const memberSchema = z
  .object({
    id: z.string(),
    salonId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().describe('E.164'),
    role: z.enum(MEMBER_ROLES),
    permissions: z.array(z.enum(PERMISSIONS)).describe('The OWNER always has all of them.'),
    providesServices: z.boolean(),
    photoKey: z.string().optional(),
    branchId: z
      .string()
      .nullable()
      .describe('The member’s branch; null for the owner (every branch)'),
  })
  .openapi('MemberProfile');

const sessionSchema = successResponseSchema(
  z.object({
    accessToken: z.string(),
    accessTokenExpiresAt: z.iso.datetime(),
    refreshToken: z.string().describe('Rotates on every refresh; keep only the newest.'),
    refreshTokenExpiresAt: z.iso.datetime(),
    member: memberSchema,
  }),
);
const emptySchema = successResponseSchema(z.null());

export const registerMerchantAuthDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_AUTH_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const route = (
    path: string,
    summary: string,
    description: string,
    schema: z.ZodType,
    body: z.ZodType,
    label: string,
    statuses: number[],
  ): void => {
    registry.registerPath({
      method: 'post',
      path: `${base}${path}`,
      tags: ['Auth'],
      summary,
      description,
      security: [],
      request: { headers, body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema } } } },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse(label, body),
        ...errorResponses(HTTP_STATUS.badRequest, HTTP_STATUS.serviceUnavailable, ...statuses),
      },
    });
  };
  route(
    MERCHANT_AUTH_ROUTES.checkPhone,
    'Check a number before sending the OTP',
    '404 `PHONE_NOT_REGISTERED` when the number is not linked to a salon (the app offers to register one); 403 `MEMBER_INACTIVE` when the owner removed the member.',
    checkPhoneSchema,
    emptySchema,
    'The number belongs to an active member',
    [HTTP_STATUS.forbidden, HTTP_STATUS.notFound],
  );
  route(
    MERCHANT_AUTH_ROUTES.login,
    'Log in with a Firebase ID token',
    'The token must prove the phone. Errors: `OTP_INVALID`, `OTP_EXPIRED` (401), `OTP_BLOCKED` (429), `MEMBER_INACTIVE` (403), `PHONE_NOT_REGISTERED` (404). The profile carries role, salon and permissions for the app to cache.',
    loginSchema,
    sessionSchema,
    'Session',
    [
      HTTP_STATUS.unauthorized,
      HTTP_STATUS.forbidden,
      HTTP_STATUS.notFound,
      HTTP_STATUS.tooManyRequests,
    ],
  );
  route(
    MERCHANT_AUTH_ROUTES.refresh,
    'Rotate the refresh token',
    'Returns a new token pair and the current profile. Reusing an old refresh token ends every session of that login (401). A removed member gets 403 `MEMBER_INACTIVE` and all sessions end.',
    refreshSchema,
    sessionSchema,
    'Session',
    [HTTP_STATUS.unauthorized, HTTP_STATUS.forbidden],
  );
  route(
    MERCHANT_AUTH_ROUTES.logout,
    'Log out',
    'Revokes the refresh token and unlinks the device. Always succeeds for well-formed tokens.',
    refreshSchema,
    emptySchema,
    'Logged out',
    [],
  );
};
