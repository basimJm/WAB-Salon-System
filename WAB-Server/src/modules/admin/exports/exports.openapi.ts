import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ADMIN_EXPORT_ROUTES,
  EXPORT_FORMATS,
  EXPORT_KINDS,
  EXPORT_STATUSES,
} from '../../../constants/exports';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { createExportBody, exportParams, exportsQuery } from './exports.validation';

const exportView = z.object({
  id: z.string(),
  kind: z.enum(EXPORT_KINDS),
  format: z.enum(EXPORT_FORMATS),
  params: z.record(z.string(), z.unknown()),
  status: z.enum(EXPORT_STATUSES),
  rowCount: z.number().nullable(),
  failure: z.enum(['TOO_MANY_ROWS', 'GENERATION_FAILED']).nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  downloadUrl: z.string().nullable().describe('Signed link valid for 5 minutes; only when DONE'),
});

export const registerAdminExportDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_EXPORT_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.serviceUnavailable,
  );
  registry.registerPath({
    method: 'post',
    path: base,
    tags: ['Exports'],
    summary: 'Request an Excel / CSV / PDF export of a report, the transactions or the audit log',
    description:
      'Runs in the background (audited). Poll `GET /exports/{id}` until `status` is DONE and use `downloadUrl`. More than 10 000 rows fails with `TOO_MANY_ROWS`: narrow the filter. PDF text is Latin only.',
    request: { headers, body: { content: { 'application/json': { schema: createExportBody } } } },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Export', successResponseSchema(exportView)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Exports'],
    summary: 'Exports, newest first',
    request: { headers, query: exportsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Exports', successResponseSchema(z.array(exportView))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags: ['Exports'],
    summary: 'One export with its status and, when DONE, a fresh download link',
    request: { headers, params: exportParams },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Export', successResponseSchema(exportView)),
      ...failures,
    },
  });
};
