import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { JSON_CONTENT_TYPE } from '../../../constants/docs';
import { HTTP_STATUS } from '../../../constants/http';
import { INSTALLATION_ROUTES } from '../../../constants/installations';
import { API_PREFIXES, type ApiNamespace } from '../../../constants/server';
import {
  acceptLanguageHeader,
  errorResponses,
  jsonResponse,
  successResponseSchema,
} from '../../../docs/schemas';
import { z } from '../../../docs/zod';
import { pushEnabledSchema, registerInstallationSchema } from './installations.validation';

const resultSchema = successResponseSchema(
  z.object({
    installationId: z.string(),
    linked: z.boolean().describe('The device is now tied to the signed-in account.'),
  }),
);
const emptySchema = successResponseSchema(z.null());

const registerDocs = (registry: OpenAPIRegistry, namespace: ApiNamespace): void => {
  const base = `${API_PREFIXES[namespace]}${INSTALLATION_ROUTES.base}`;
  const customer = namespace === 'customer';
  registry.registerPath({
    method: 'put',
    path: base,
    tags: ['Installations'],
    summary: 'Register or update this device',
    description: customer
      ? 'Firebase app-instance id, FCM token and versions. Works for guests; with a customer token the device is also linked to the account, which joins the guest analytics history to it. A push token belongs to one device: registering it here removes it from any other.'
      : "Firebase app-instance id, FCM token and versions. Links the device to the signed-in member so the salon's booking requests reach it.",
    ...(customer ? { security: [] } : {}),
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      body: {
        required: true,
        content: { [JSON_CONTENT_TYPE]: { schema: registerInstallationSchema } },
      },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Registered', resultSchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        ...(customer ? [] : [HTTP_STATUS.forbidden]),
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};

export const registerCustomerInstallationDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'customer');
  registry.registerPath({
    method: 'patch',
    path: `${API_PREFIXES.customer}${INSTALLATION_ROUTES.base}${INSTALLATION_ROUTES.pushEnabled}`,
    tags: ['Installations'],
    summary: 'Turn push notifications on or off',
    description:
      'One switch for the whole account. Off means no push is sent, but notifications still appear in the in-app list.',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: pushEnabledSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', emptySchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};

export const registerMerchantInstallationDocs = (registry: OpenAPIRegistry): void => {
  registerDocs(registry, 'merchant');
  registry.registerPath({
    method: 'patch',
    path: `${API_PREFIXES.merchant}${INSTALLATION_ROUTES.base}${INSTALLATION_ROUTES.pushEnabled}`,
    tags: ['Installations'],
    summary: 'Turn push notifications on or off',
    description:
      'The member’s switch (M25). Off means no push is sent (booking requests too), but notifications still appear in the in-app list.',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      body: { required: true, content: { [JSON_CONTENT_TYPE]: { schema: pushEnabledSchema } } },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse('Saved', emptySchema),
      ...errorResponses(
        HTTP_STATUS.badRequest,
        HTTP_STATUS.unauthorized,
        HTTP_STATUS.forbidden,
        HTTP_STATUS.tooManyRequests,
        HTTP_STATUS.serviceUnavailable,
      ),
    },
  });
};
