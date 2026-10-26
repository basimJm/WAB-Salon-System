import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BRANCH_STATUSES } from '../../../constants/branches';
import { HTTP_STATUS } from '../../../constants/http';
import { DAYS_OF_WEEK } from '../../../constants/time';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  branchParams,
  branchReasonSchema,
  createBranchSchema,
  updateBranchSchema,
} from './branch.schemas';

/** A branch as returned by the merchant and admin branch endpoints (§3.3a). */
export const branchViewDoc = z.object({
  id: z.string(),
  name: z.object({ ar: z.string(), en: z.string() }),
  isMain: z.boolean(),
  status: z.enum(BRANCH_STATUSES),
  location: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  locationText: z.string().nullable(),
  cityId: z.string().nullable(),
  areaId: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  weeklySchedule: z.array(
    z.object({
      day: z.enum(DAYS_OF_WEEK),
      isOff: z.boolean(),
      open: z.string(),
      close: z.string(),
    }),
  ),
  offline: z.object({ reason: z.string(), at: z.string() }).nullable(),
  completeness: z.object({ missing: z.array(z.string()), isComplete: z.boolean() }),
});

/**
 * Registers the branch CRUD paths under `base` (`/merchant/v1/branches` or the admin salon path).
 * `extraBody` adds fields every write needs there (the admin's `reason`).
 */
export const registerBranchCrudDocs = (
  registry: OpenAPIRegistry,
  options: {
    base: string;
    tags: string[];
    who: string;
    params?: z.ZodObject;
    /** Paging query of the list (admin); the list answer then carries `meta`. */
    listQuery?: z.ZodObject;
    extraBody?: z.ZodObject;
  },
): void => {
  const { base, tags, who } = options;
  const byId = `${base}/{branchId}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const params = (options.params ?? z.object({})).extend(branchParams.shape);
  const listParams = options.params;
  const withExtra = (schema: z.ZodType): z.ZodType =>
    options.extraBody === undefined ? schema : z.intersection(schema, options.extraBody);
  const body = (
    schema: z.ZodType,
  ): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
    required: true,
    content: { 'application/json': { schema: withExtra(schema) } },
  });
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
  const one = jsonResponse('Branch', successResponseSchema(branchViewDoc));
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: `Branches of the salon, main first (${who})${options.listQuery === undefined ? '' : '; paged, `meta` = {page, pageSize, total}'}`,
    request: {
      headers,
      ...(listParams === undefined ? {} : { params: listParams }),
      ...(options.listQuery === undefined ? {} : { query: options.listQuery }),
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Branches', successResponseSchema(z.array(branchViewDoc))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary: `Add a branch; the first one is the main branch (${who}; BRANCH_LIMIT_REACHED at salon.maxBranches)`,
    request: {
      headers,
      body: body(createBranchSchema),
      ...(listParams === undefined ? {} : { params: listParams }),
    },
    responses: { [HTTP_STATUS.created]: one, ...failures },
  });
  registry.registerPath({
    method: 'get',
    path: byId,
    tags,
    summary: `One branch (${who})`,
    request: { headers, params },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: byId,
    tags,
    summary: `Edit name, location, address, city/area or contacts (${who})`,
    request: { headers, params, body: body(updateBranchSchema) },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${byId}/main`,
    tags,
    summary: `Make this branch the main one (${who})`,
    request: {
      headers,
      params,
      ...(options.extraBody === undefined ? {} : { body: body(z.object({})) }),
    },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${byId}/offline`,
    tags,
    summary: `Hide the branch from customers; the other branches stay bookable (${who})`,
    request: { headers, params, body: body(branchReasonSchema) },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${byId}/online`,
    tags,
    summary: `Bring an offline branch back (${who})`,
    request: {
      headers,
      params,
      ...(options.extraBody === undefined ? {} : { body: body(z.object({})) }),
    },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${byId}/close`,
    tags,
    summary: `Close for good (history kept); 409 BRANCH_HAS_UPCOMING_BOOKINGS lists the bookings, 422 LAST_BRANCH, 422 INVALID_TRANSITION for the main branch (${who})`,
    request: {
      headers,
      params,
      ...(options.extraBody === undefined ? {} : { body: body(z.object({})) }),
    },
    responses: { [HTTP_STATUS.ok]: one, ...failures },
  });
};
