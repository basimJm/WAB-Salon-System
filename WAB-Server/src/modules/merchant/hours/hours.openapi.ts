import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_HOURS_ROUTES } from '../../../constants/hours';
import { API_PREFIXES } from '../../../constants/server';
import { DAYS_OF_WEEK } from '../../../constants/time';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { bookingConflictDoc } from '../../shared/salonEdit/conflict.openapi';
import {
  closureParams,
  closurePatchSchema,
  closureRangeSchema,
  closureSchema,
  weeklySchema,
} from './hours.validation';

const closure = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  reason: z.string(),
  editable: z.boolean().describe('Only closures that start after today can be changed or removed.'),
});
const hours = successResponseSchema(
  z.object({
    weeklySchedule: z.array(
      z.object({
        day: z.enum(DAYS_OF_WEEK),
        isOff: z.boolean(),
        open: z.string(),
        close: z.string(),
      }),
    ),
    closures: z.array(closure).describe('Closures that have not ended yet, soonest first.'),
    today: z.object({
      date: z.string(),
      isClosed: z.boolean(),
      closedReason: z.string().nullable(),
      open: z.string().nullable(),
      close: z.string().nullable(),
      isOpenNow: z.boolean(),
    }),
  }),
);

/**
 * `options` registers the same paths under another base (the per-branch routes
 * `/merchant/v1/branches/{branchId}/…`) with extra path params.
 */
export const registerMerchantHoursDocs = (
  registry: OpenAPIRegistry,
  options: { base?: string; params?: z.ZodObject; tagSuffix?: string } = {},
): void => {
  const base = options.base ?? `${API_PREFIXES.merchant}${MERCHANT_HOURS_ROUTES.base}`;
  const scope = options.params;
  /** Adds the extra path params to a request (or the only params when it had none). */
  type Request = NonNullable<RouteConfig['request']>;
  const withScope = (request: Request): Request => {
    if (scope === undefined) return request;
    const params = request.params as z.ZodObject | undefined;
    return { ...request, params: params === undefined ? scope : params.extend(scope.shape) };
  };
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Working hours'];
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
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Weekly schedule, upcoming closures and today’s hours (WORKING_HOURS_MANAGE)',
    request: withScope({ headers }),
    responses: { [HTTP_STATUS.ok]: jsonResponse('Hours', hours), ...failures },
  });
  registry.registerPath({
    method: 'put',
    path: `${base}${MERCHANT_HOURS_ROUTES.weekly}`,
    tags,
    summary:
      'Replace the weekly schedule (7 days, slot-aligned, close after open). 409 SCHEDULE_CONFLICT lists bookings the change would break.',
    request: withScope({ headers, body: body(weeklySchema) }),
    responses: { [HTTP_STATUS.ok]: jsonResponse('Hours', hours), ...failures },
  });
  const affected = jsonResponse(
    'Affected bookings (nothing is saved)',
    successResponseSchema(z.array(bookingConflictDoc)),
  );
  registry.registerPath({
    method: 'post',
    path: `${base}${MERCHANT_HOURS_ROUTES.weeklyPreview}`,
    tags,
    summary:
      'Preview a weekly schedule: the upcoming PENDING/APPROVED bookings it would break (same checks as the save, nothing changes)',
    request: withScope({ headers, body: body(weeklySchema) }),
    responses: { [HTTP_STATUS.ok]: affected, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${MERCHANT_HOURS_ROUTES.closuresPreview}`,
    tags,
    summary: 'Preview a closure: the upcoming PENDING/APPROVED bookings it would break',
    request: withScope({ headers, body: body(closureRangeSchema) }),
    responses: { [HTTP_STATUS.ok]: affected, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${MERCHANT_HOURS_ROUTES.closures}`,
    tags,
    summary:
      'Add an exceptional closure (dates in the salon calendar, `to` inclusive, not in the past)',
    request: withScope({ headers, body: body(closureSchema) }),
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Added', successResponseSchema(closure)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: `${base}/closures/{id}`,
    tags,
    summary: 'Change a closure that has not started',
    request: withScope({ headers, params: closureParams, body: body(closurePatchSchema) }),
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', successResponseSchema(closure)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'delete',
    path: `${base}/closures/{id}`,
    tags,
    summary: 'Remove a closure that has not started',
    request: withScope({ headers, params: closureParams }),
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Removed', successResponseSchema(z.null())),
      ...failures,
    },
  });
};
