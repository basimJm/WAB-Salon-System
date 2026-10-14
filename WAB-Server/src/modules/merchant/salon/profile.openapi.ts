import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import {
  MERCHANT_PROFILE_ROUTES,
  MERCHANT_SALON_ROUTES,
  SALON_STATES,
} from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { profilePatchSchema } from './profile.validation';

const profile = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(['MALE', 'FEMALE']),
  state: z.enum(SALON_STATES),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  coverKey: z.string().nullable(),
  profileKey: z.string().nullable(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  locationText: z.string().nullable(),
  cityId: z.string().nullable(),
  areaId: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  completeness: z.object({ missing: z.array(z.string()), isComplete: z.boolean() }),
  rating: z.object({ avg: z.number(), count: z.number() }),
});

export const registerMerchantProfileDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_SALON_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Salon profile'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'My salon: profile, state and what is still missing (any member)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Salon', successResponseSchema(profile)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}${MERCHANT_PROFILE_ROUTES.profile}`,
    tags,
    summary:
      'Edit the profile (SALON_PROFILE_MANAGE); completeness is recomputed and the salon may go LIVE',
    request: {
      headers,
      body: { required: true, content: { 'application/json': { schema: profilePatchSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', successResponseSchema(profile)),
      ...failures,
    },
  });
};
