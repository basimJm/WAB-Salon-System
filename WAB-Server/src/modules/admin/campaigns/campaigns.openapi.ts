import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ADMIN_CAMPAIGN_ROUTES,
  CAMPAIGN_AUDIENCE_KINDS,
  CAMPAIGN_STATUSES,
} from '../../../constants/campaigns';
import { APP_KINDS } from '../../../constants/enums';
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
  audienceSizeBody,
  campaignParams,
  campaignsQuery,
  cancelCampaignBody,
  createCampaignBody,
} from './campaigns.validation';

const text = z.object({ ar: z.string(), en: z.string() });
const row = z.object({
  id: z.string(),
  title: text,
  body: text,
  app: z.enum(APP_KINDS),
  audience: z.object({
    kind: z.enum(CAMPAIGN_AUDIENCE_KINDS),
    gender: z.string().optional(),
    cityIds: z.array(z.string()).optional(),
    salonId: z.string().optional(),
    customerIds: z.array(z.string()).optional(),
  }),
  link: z.string().nullable(),
  status: z.enum(CAMPAIGN_STATUSES),
  scheduledAt: z.string(),
  sentAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  stats: z.object({
    targeted: z.number(),
    sent: z.number(),
    delivered: z.number(),
    opened: z.number(),
    failed: z.number(),
  }),
  createdBy: z.string(),
});

export const registerAdminCampaignDocs = (registry: OpenAPIRegistry): void => {
  const base = `${API_PREFIXES.admin}${ADMIN_CAMPAIGN_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const tags = ['Admin push campaigns'];
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.notFound,
    HTTP_STATUS.unprocessableEntity,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const json = (schema: z.ZodType): { content: { 'application/json': { schema: z.ZodType } } } => ({
    content: { 'application/json': { schema } },
  });
  const one = { [HTTP_STATUS.ok]: jsonResponse('Campaign', successResponseSchema(row)) };
  registry.registerPath({
    method: 'get',
    path: base,
    tags,
    summary: 'Campaign history with audience size, sent, delivered, opened and failures',
    request: { headers, query: campaignsQuery },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Page',
        z.object({
          success: z.literal(true),
          message: z.string(),
          data: z.array(row),
          meta: paginationMetaSchema,
        }),
      ),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: base,
    tags,
    summary:
      'Compose a campaign; sent now or at `scheduledAt` (customers also get it in their list)',
    request: { headers, body: json(createCampaignBody) },
    responses: {
      [HTTP_STATUS.created]: jsonResponse('Created', successResponseSchema(row)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_CAMPAIGN_ROUTES.audience}`,
    tags,
    summary: 'How many accounts and devices an audience reaches',
    request: { headers, body: json(audienceSizeBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Size', successResponseSchema(z.object({ size: z.number() }))),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'get',
    path: `${base}/{id}`,
    tags,
    summary: 'One campaign with live statistics',
    request: { headers, params: campaignParams },
    responses: { ...one, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}/{id}/cancel`,
    tags,
    summary: 'Cancel a campaign that has not started sending (422 otherwise)',
    request: { headers, params: campaignParams, body: json(cancelCampaignBody) },
    responses: { ...one, ...failures },
  });
};
