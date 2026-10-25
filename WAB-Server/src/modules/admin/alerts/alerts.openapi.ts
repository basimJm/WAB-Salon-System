import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ADMIN_ALERT_ROUTES,
  ALERT_ENTITY_TYPES,
  ALERT_KINDS,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
} from '../../../constants/alerts';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { alertParams, alertsQuery } from './alerts.validation';

const alert = z.object({
  id: z.string(),
  kind: z.enum(ALERT_KINDS),
  severity: z.enum(ALERT_SEVERITIES),
  /** In the `Accept-Language` language; `titles` carries both (SRV-150). */
  title: z.string(),
  titles: z.object({ ar: z.string(), en: z.string() }),
  entityType: z.enum(ALERT_ENTITY_TYPES).nullable(),
  entityId: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(ALERT_STATUSES),
  emailedAt: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const registerAdminAlertDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_ALERT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Alerts'],
    summary: 'Alerts, newest first (filter by status or kind)',
    request: { headers, query: alertsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Alerts', successResponseSchema(z.array(alert))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}${ADMIN_ALERT_ROUTES.count}`,
    tags: ['Alerts'],
    summary: 'How many alerts are still NEW (the bell badge)',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Count', successResponseSchema(z.object({ new: z.number() }))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/acknowledge`,
    tags: ['Alerts'],
    summary: 'Acknowledge an alert (repeating it is harmless)',
    request: { headers, params: alertParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Alert', successResponseSchema(alert)),
      ...failures,
    },
  });
};
