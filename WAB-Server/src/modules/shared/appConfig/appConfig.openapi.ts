import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { APP_CONFIG_ROUTES, VERSION_STATUSES } from '../../../constants/appConfig';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { appConfigQuerySchema } from './appConfig.validation';

const responseSchema = successResponseSchema(
  z.object({
    update: z.object({
      status: z.enum(VERSION_STATUSES),
      latest: z.string().nullable(),
      minSupported: z.string().nullable(),
      storeUrl: z.string().nullable(),
    }),
    maintenance: z.object({
      enabled: z.boolean(),
      message: z.string().nullable().describe('In the request language; only while enabled.'),
    }),
    nearbyRadiusKm: z.number(),
    otp: z.object({ length: z.number(), resendAfterSeconds: z.number() }),
    contact: z.object({ phone: z.string(), whatsapp: z.string(), email: z.string() }).nullable(),
  }),
);

const registerDocs = (registry: OpenAPIRegistry, namespace: ApiNamespace): void => {
  registry.registerPath({
    method: 'get',
    path: `${API_PREFIXES[namespace]}${APP_CONFIG_ROUTES.base}`,
    tags: ['App config'],
    summary: 'Version policy, maintenance, OTP and discovery settings',
    description:
      'Public. Called at launch with the installed version: tells the app whether it must or may update, whether maintenance is on, plus OTP length/resend and the nearby radius.',
    security: [],
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      query: appConfigQuerySchema,
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Config', responseSchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};

export const registerCustomerAppConfigDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'customer');
};
export const registerMerchantAppConfigDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'merchant');
};
