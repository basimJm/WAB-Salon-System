import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_CRUD_ROUTES } from '../../../constants/adminCrud';
import { HTTP_STATUS } from '../../../constants/http';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';

export interface CrudDocs {
  /** Full path without the id, e.g. `/admin/v1/locations/countries`. */
  readonly basePath: string;
  readonly tag: string;
  readonly label: string;
  readonly entity: z.ZodType;
  readonly query: z.ZodObject;
  readonly create: z.ZodType;
  readonly update: z.ZodType;
}

const failures = errorResponses(
  HTTP_STATUS.badRequest,
  HTTP_STATUS.unauthorized,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.notFound,
  HTTP_STATUS.conflict,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serviceUnavailable,
);

const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { 'application/json': { schema } },
});

/** The four routes of `createAdminCrudRouter`, documented the same way for every resource. */
export const registerCrudDocs = (registry: OpenAPIRegistry, docs: CrudDocs): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = [docs.tag];
  const one = successResponseSchema(docs.entity);
  const byId = `${docs.basePath}${ADMIN_CRUD_ROUTES.byId.replace(':id', '{id}')}`;
  const params = z.object({ id: z.string() });
  registry.registerPath({
    method: 'get',
    path: docs.basePath,
    tags,
    summary: `List ${docs.label} records (both languages)`,
    request: { headers, query: docs.query },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Page', successResponseSchema(z.array(docs.entity))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: byId,
    tags,
    summary: `Get one ${docs.label}`,
    request: { headers, params },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Record', one), ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: docs.basePath,
    tags,
    summary: `Create a ${docs.label} (reason required, audited)`,
    request: { headers, body: body(docs.create) },
    responses: { [HTTP_STATUS.created]: jsonResponse('Created', one), ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: byId,
    tags,
    summary: `Change a ${docs.label} (reason required, audited)`,
    request: { headers, params, body: body(docs.update) },
    responses: { [HTTP_STATUS.ok]: jsonResponse('Updated', one), ...failures },
  });
};
