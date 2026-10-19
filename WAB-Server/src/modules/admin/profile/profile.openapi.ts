import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ADMIN_PROFILE_ROUTES } from '../../../constants/adminProfile';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { HTTP_STATUS } from '../../../constants/http';
import { API_PREFIXES } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import {
  changePasswordBody,
  confirmEmailChangeBody,
  requestEmailChangeBody,
  updateProfileBody,
} from './profile.validation';

const profileSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    alertEmails: z
      .array(z.string())
      .describe('Addresses that receive the platform alerts; empty = the sign-in address.'),
    lastLoginAt: z.iso.datetime().nullable(),
  })
  .openapi('AdminProfile');
const challengeSchema = z.object({
  expiresAt: z.iso.datetime().describe('The emailed code stops working at this instant.'),
  resendAfterSeconds: z.int(),
});
const body = (
  schema: z.ZodType,
): { required: true; content: Record<string, { schema: z.ZodType }> } => ({
  required: true,
  content: { [JSON_CONTENT_TYPE]: { schema } },
});

export const registerAdminProfileDocs = (registry: OpenAPIRegistry): void => {
  const headers = z.object({ 'Accept-Language': acceptLanguageHeader });
  const base = `${API_PREFIXES.admin}${ADMIN_PROFILE_ROUTES.base}`;
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
  registry.registerPath({
    method: 'get',
    path: base,
    tags: ['Admin profile'],
    summary: 'The signed-in admin’s profile',
    request: { headers },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profileSchema)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'patch',
    path: base,
    tags: ['Admin profile'],
    summary: 'Replace the alert recipients',
    description:
      'Audited. At most `ADMIN_ALERT_EMAILS_MAX` distinct addresses; an empty list sends the alerts to the sign-in address.',
    request: { headers, body: body(updateProfileBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Profile', successResponseSchema(profileSchema)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_PROFILE_ROUTES.password}`,
    tags: ['Admin profile'],
    summary: 'Change the password',
    description:
      'A wrong current password counts toward the sign-in lockout and answers 403 `CURRENT_PASSWORD_INVALID` (not 401, so the panel keeps the session); 429 while locked. The new password is at least 12 characters and differs from the current one (422 `VALIDATION_ERROR`). Every session of the admin ends: sign in again.',
    request: { headers, body: body(changePasswordBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Changed', successResponseSchema(z.null())),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_PROFILE_ROUTES.emailRequest}`,
    tags: ['Admin profile'],
    summary: 'Step 1 of an email change: code to the new address',
    description:
      'Needs the current password (same lockout rules, 403 `CURRENT_PASSWORD_INVALID`). The new address must be free (409 `EMAIL_ALREADY_USED`). A code is emailed to the NEW address; nothing changes until step 2.',
    request: { headers, body: body(requestEmailChangeBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Code sent', successResponseSchema(challengeSchema)),
      ...failures,
    },
  });
  registry.registerPath({
    method: 'post',
    path: `${base}${ADMIN_PROFILE_ROUTES.emailVerify}`,
    tags: ['Admin profile'],
    summary: 'Step 2 of an email change: confirm the code',
    description:
      'The right code (once, 5 minutes) changes the sign-in email and ends every session. Errors: 422 `OTP_INVALID` / `OTP_EXPIRED`; a wrong code counts toward the lockout (429 while locked); 409 `EMAIL_ALREADY_USED` if the address was taken meanwhile.',
    request: { headers, body: body(confirmEmailChangeBody) },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Changed', successResponseSchema(profileSchema)),
      ...failures,
    },
  });
};
