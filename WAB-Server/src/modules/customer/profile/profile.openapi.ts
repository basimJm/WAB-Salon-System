import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { CUSTOMER_PROFILE_ROUTES } from '../../../constants/customerProfile';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { avatarBody, updateProfileBody } from './profile.validation';

const profile = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  phone: z.object({
    countryCode: z.string(),
    dialCode: z.string(),
    number: z.string(),
    e164: z.string(),
  }),
  cityId: z.string(),
  areaId: z.string(),
  language: z.enum(['ar', 'en']),
  pushEnabled: z.boolean(),
  avatarUrl: z.string().nullable(),
});

export const registerCustomerProfileDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.customer}${CUSTOMER_PROFILE_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Customer profile'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const ok = { [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profile)) };
  const json = (schema: z.ZodType): { content: { 'application/json': { schema: z.ZodType } } } => ({
    content: { 'application/json': { schema } },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'My profile (S21/S22)',
    request: { headers },
    responses: { ...ok, ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: base,
    tags,
    summary:
      'Edit personal information. The phone number changes only through `/auth/change-phone` (OTP).',
    request: { headers, body: json(updateProfileBody) },
    responses: { ...ok, ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: `${base}${CUSTOMER_PROFILE_ROUTES.avatar}`,
    tags,
    summary: 'Set the profile photo from a confirmed CUSTOMER_AVATAR upload',
    request: { headers, body: json(avatarBody) },
    responses: { ...ok, ...failures },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}${CUSTOMER_PROFILE_ROUTES.avatar}`,
    tags,
    summary: 'Remove the profile photo (back to the default avatar)',
    request: { headers },
    responses: { ...ok, ...failures },
  });
  registry.registerPath({
    method: 'delete',
    path: base,
    tags,
    summary:
      'Delete my account: deactivated for the grace period (30 days by default), then anonymized; signing in again within it restores it. All sessions end.',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Scheduled',
        successResponseSchema(z.object({ deletionScheduledAt: z.string() })),
      ),
      ...failures,
    },
  });
};
