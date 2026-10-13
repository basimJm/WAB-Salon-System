import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { PERMISSIONS } from '../../../constants/enums';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import { MERCHANT_TEAM_ROUTES } from '../../../constants/team';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { createMemberSchema, memberParams, teamQuery, updateMemberSchema } from './team.validation';

const member = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  photoUrl: z.string().nullable(),
  role: z.enum(['OWNER', 'MANAGER', 'EMPLOYEE']),
  permissions: z.array(z.enum(PERMISSIONS)).describe('The OWNER always has all.'),
  active: z.boolean(),
  providesServices: z.boolean(),
});

export const registerMerchantTeamDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.merchant}${MERCHANT_TEAM_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Team'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.conflict,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const body = (
    schema: z.ZodType,
  ): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
    required: true,
    content: { 'application/json': { schema } },
  });
  const one = (description: string): ReturnType<typeof jsonResponse> =>
    jsonResponse(description, successResponseSchema(member));
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Team members (STAFF_MANAGE; the owner always)',
    request: { headers, query: teamQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Members',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(member),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags,
    summary: 'One member (STAFF_MANAGE)',
    request: { headers, params: memberParams },
    responses: { [HTTP_STATUS.ok]: one('Member'), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Add a member (OWNER only): the member can sign in with that phone; permissions start from the role template unless sent',
    request: { headers, body: body(createMemberSchema) },
    responses: { [HTTP_STATUS.created]: one('Added'), ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/{id}`,
    tags,
    summary:
      'Change name, photo, role or permissions (OWNER only). Owner-only capabilities can never be granted; the OWNER’s own role and permissions cannot change (422 LAST_OWNER).',
    request: { headers, params: memberParams, body: body(updateMemberSchema) },
    responses: { [HTTP_STATUS.ok]: one('Saved'), ...failures },
  });
  for (const action of ['deactivate', 'reactivate'] as const) {
    registry.registerPath({
      method: 'post',
      path: `${base}/{id}/${action}`,
      tags,
      summary:
        action === 'deactivate'
          ? 'Switch a member off: all sessions end and devices are detached (OWNER only; the owner cannot be deactivated)'
          : 'Switch a member on again (OWNER only)',
      request: { headers, params: memberParams },
      responses: { [HTTP_STATUS.ok]: one('Member'), ...failures },
    });
  }
};
