import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_CUSTOMER_ROUTES } from '../../../constants/adminCustomers';
import { CAMPAIGN_STATUSES } from '../../../constants/campaigns';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { GENDERS, LANGUAGES, NOTIFICATION_TYPES } from '../../../constants/enums';
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
import { adminReviewRowSchema } from '../reviews/reviews.openapi';
import {
  customerParams,
  editCustomerBody,
  pageQuery,
  pushBody,
  reasonBody,
} from './customerExtras.validation';

const text = z.object({ ar: z.string(), en: z.string() });
const profile = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  gender: z.enum(GENDERS),
  cityId: z.string(),
  areaId: z.string(),
  language: z.enum(LANGUAGES),
});
const notification = z.object({
  id: z.string(),
  event: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: text,
  body: text,
  readAt: z.string().nullable(),
  pushSent: z.boolean(),
  pushResult: z.string().nullable(),
  createdAt: z.string(),
});
const list = (item: z.ZodType): z.ZodType =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(item),
    meta: paginationMetaSchema,
  });
const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { [JSON_CONTENT_TYPE]: { schema } },
});

export const registerAdminCustomerExtrasDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_CUSTOMER_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin customers'];
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
  const path = (route: string): string => `${base}${route.replace(/:(\w+)/g, '{$1}')}`;
  registry.registerPath({
    method: 'patch',
    path: path(ADMIN_CUSTOMER_ROUTES.byId),
    tags,
    summary: 'Correct a customer’s profile (name, email, gender, city/area, language)',
    description:
      'Needs a `reason`, is audited with before/after. The phone number is not editable here. Works for blocked and pending-deletion accounts; an anonymized account answers 409.',
    request: { headers, params: customerParams, body: body(editCustomerBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profile)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_CUSTOMER_ROUTES.reviews),
    tags,
    summary: 'Reviews the customer wrote, every moderation status, newest first',
    request: { headers, params: customerParams, query: pageQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Reviews', list(adminReviewRowSchema)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: path(ADMIN_CUSTOMER_ROUTES.notifications),
    tags,
    summary: 'Notifications the platform sent to the customer, newest first',
    request: { headers, params: customerParams, query: pageQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Notifications', list(notification)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_CUSTOMER_ROUTES.push),
    tags,
    summary: 'Send a push to this one customer, now',
    description:
      'Creates and sends a campaign for exactly this customer (audited as a campaign). Only an ACTIVE account can be pushed (422 `INVALID_TRANSITION`). Delivery follows the customer’s push setting and devices; the result shows in the notifications list.',
    request: { headers, params: customerParams, body: body(pushBody) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse(
        'Queued',
        successResponseSchema(
          z.object({
            campaignId: z.string(),
            status: z.enum(CAMPAIGN_STATUSES),
            scheduledAt: z.string(),
          }),
        ),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: path(ADMIN_CUSTOMER_ROUTES.forceDelete),
    tags,
    summary: 'Delete a customer at once, without the 30-day grace period',
    description:
      'Anonymizes the account immediately (reason + audit) and ends every session; bookings and transactions stay for accounting. Cannot be undone. 409 when the account is already anonymized.',
    request: { headers, params: customerParams, body: body(reasonBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Deleted', successResponseSchema(z.null())),
      ...failures,
    },
  });
};
