import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { HTTP_STATUS } from '../../../constants/http';
import { OTP_ROUTES } from '../../../constants/otp';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  customerOtpRequestSchema,
  merchantOtpRequestSchema,
  wrongAttemptSchema,
} from './otp.validation';

const decisionSchema = successResponseSchema(
  z.object({
    allowed: z.boolean().describe('The app may now ask Firebase to send the SMS.'),
    otpLength: z.number().int().describe('Number of code boxes; never hardcode it in the app.'),
    resendAfterSeconds: z.number().int().describe('Resend countdown in seconds.'),
    blockedUntil: z.iso.datetime().optional().describe('Set while the phone is blocked (UTC).'),
  }),
);

const wrongAttemptResultSchema = successResponseSchema(
  z.object({
    blocked: z.boolean(),
    attemptsRemaining: z.number().int(),
    blockedUntil: z.iso.datetime().optional(),
  }),
);

const register = (
  registry: OpenAPIRegistry,
  namespace: ApiNamespace,
  requestSchema: typeof customerOtpRequestSchema | typeof merchantOtpRequestSchema,
): void => {
  const base = `${API_PREFIXES[namespace]}${OTP_ROUTES.base}`;
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  registry.registerPath({
    method: 'post',
    path: `${base}${OTP_ROUTES.request}`,
    tags: ['Auth'],
    summary: 'OTP pre-check',
    description:
      'Public. Checks the platform limits before the app asks Firebase to send the SMS. A blocked phone or a running resend countdown answers 200 with `allowed: false`.',
    security: [],
    request: {
      headers,
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: requestSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Decision', decisionSchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${OTP_ROUTES.wrongAttempt}`,
    tags: ['Auth'],
    summary: 'Report a wrong OTP code',
    description:
      'Public. The app reports a wrong code from Firebase; it counts toward the wrong-attempts block.',
    security: [],
    request: {
      headers,
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: wrongAttemptSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Attempts left or the block', wrongAttemptResultSchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};

export const registerCustomerOtpDocs = (registry: OpenAPIRegistry): void => {
  register(registry, 'customer', customerOtpRequestSchema);
};
export const registerMerchantOtpDocs = (registry: OpenAPIRegistry): void => {
  register(registry, 'merchant', merchantOtpRequestSchema);
};
