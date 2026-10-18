import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_AUDIT_LOG_ROUTES, ADMIN_SETTINGS_ROUTES } from '../../../constants/adminSettings';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  paginationMetaSchema,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  auditLogParams,
  auditLogsQuery,
  settingParams,
  updateSettingBody,
} from './settings.validation';

const setting = z.object({
  key: z.string(),
  value: z.unknown(),
  default: z.unknown(),
  isDefault: z.boolean(),
});
const log = z.object({
  id: z.string(),
  adminId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string(),
  ip: z.string(),
  userAgent: z.string(),
  createdAt: z.string(),
});

export const registerAdminSettingsDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const settings = `${API_PREFIXES.admin}${ADMIN_SETTINGS_ROUTES.base}`;
  const logs = `${API_PREFIXES.admin}${ADMIN_AUDIT_LOG_ROUTES.base}`;
  registry.registerPath({
    method: 'get',
    path: settings,
    tags: ['Admin settings'],
    summary: 'Every platform setting with its effective value and its default',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Settings', successResponseSchema(z.array(setting))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'put',
    path: `${settings}/{key}`,
    tags: ['Admin settings'],
    summary: 'Change one setting (validated, applied at once everywhere, audited with reason)',
    request: {
      headers,
      params: settingParams,
      body: { required: true, content: { 'application/json': { schema: updateSettingBody } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Setting', successResponseSchema(setting)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: logs,
    tags: ['Admin audit log'],
    summary: 'Audit log, newest first; filter by admin, action, entity and dates',
    request: { headers, query: auditLogsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Page',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(log),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${logs}/{id}`,
    tags: ['Admin audit log'],
    summary: 'One audit entry with before and after',
    request: { headers, params: auditLogParams },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Entry', successResponseSchema(log)), ...failures },
  });
};
