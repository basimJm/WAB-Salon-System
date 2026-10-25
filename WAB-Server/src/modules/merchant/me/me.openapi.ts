import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { HTTP_STATUS } from '../../../constants/http';
import { MERCHANT_AUTH_ROUTES, MERCHANT_ME_ROUTES } from '../../../constants/merchantAuth';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { memberSchema } from '../auth/auth.openapi';
import { changePhoneSchema, updateMeSchema } from './me.validation';

const meSchema = memberSchema.extend({
  photoUrl: z.string().nullable(),
  branchId: z.string().nullable().describe('null for the owner (every branch)'),
  pushEnabled: z.boolean(),
});

export const registerMerchantMeDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const ok = jsonResponse('My account', successResponseSchema(meSchema));
  const failures = errorResponses(
    HTTP_STATUS.badRequest,
    HTTP_STATUS.unauthorized,
    HTTP_STATUS.forbidden,
    HTTP_STATUS.conflict,
    HTTP_STATUS.tooManyRequests,
    HTTP_STATUS.serviceUnavailable,
  );
  const me = `${API_PREFIXES.merchant}${MERCHANT_ME_ROUTES.base}`;
  registry.registerPath({
    method: 'get',
    path: me,
    tags: ['My account'],
    summary: 'My account (M25): profile, photo, branch and push switch',
    request: { headers },
    responses: { [HTTP_STATUS.ok]: ok, ...failures },
  });
  registry.registerPath({
    method: 'patch',
    path: me,
    tags: ['My account'],
    summary: 'Change my name or photo (an uploaded MEMBER_PHOTO of mine); photoKey null removes it',
    request: {
      headers,
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: updateMeSchema } } },
    },
    responses: { [HTTP_STATUS.ok]: ok, ...failures },
  });
  registry.registerPath({
    method: 'post',
    path: `${API_PREFIXES.merchant}${MERCHANT_AUTH_ROUTES.base}${MERCHANT_AUTH_ROUTES.changePhone}`,
    tags: ['My account'],
    summary:
      'Change my phone: OTP to the new number (purpose CHANGE_PHONE), then this call with its ID token; 409 PHONE_ALREADY_REGISTERED when another member has it',
    request: {
      headers,
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: changePhoneSchema } } },
    },
    responses: { [HTTP_STATUS.ok]: ok, ...failures },
  });
};
