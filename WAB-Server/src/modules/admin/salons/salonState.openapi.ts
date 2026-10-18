import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { ADMIN_SALON_STATE_ROUTES, SALON_STATES } from '../../../constants/salon';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { reasonBody, salonParams } from './salonState.validation';

const status = z.object({
  salonId: z.string(),
  state: z.enum(SALON_STATES),
  missing: z.array(z.string()),
  isComplete: z.boolean(),
});

export const registerAdminSalonStateDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  for (const kind of ['offline', 'online'] as const) {
    registry.registerPath({
      method: 'post',
      path: `${API_PREFIXES.admin}${ADMIN_SALON_STATE_ROUTES.base}${ADMIN_SALON_STATE_ROUTES[kind].replace(':id', '{id}')}`,
      tags: ['Admin salons'],
      summary:
        kind === 'offline'
          ? 'Take a salon offline (reason required, audited)'
          : 'Bring an offline salon back: LIVE if complete, else APPROVED_INCOMPLETE (reason required, audited)',
      request: {
        headers,
        params: salonParams,
        body: { required: true, content: { 'application/json': { schema: reasonBody } } },
      },
      responses: {
        [HTTP_STATUS.ok]: jsonResponse('New state', successResponseSchema(status)),
        ...errorResponses(
          HTTP_STATUS.badRequest,
          HTTP_STATUS.unauthorized,
          HTTP_STATUS.forbidden,
          HTTP_STATUS.notFound,
          HTTP_STATUS.unprocessableEntity,
          HTTP_STATUS.tooManyRequests,
          HTTP_STATUS.serviceUnavailable,
        ),
      },
    });
  }
};
