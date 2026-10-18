import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HTTP_STATUS } from '../../constants/http';
import {
  PAYMENT_WEBHOOK_ROUTE,
  PAYMENT_WEBHOOK_IV_HEADER,
  PAYMENT_WEBHOOK_SIGNATURE_HEADERS,
  WEBHOOK_PREFIX,
} from '../../constants/payments';
import { errorResponses, jsonResponse, successResponseSchema } from '../../docs/schemas';
import { z } from '../../docs/zod';

export const registerPaymentWebhookDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'post',
    path: `${WEBHOOK_PREFIX}${PAYMENT_WEBHOOK_ROUTE}`,
    tags: ['Webhooks'],
    summary: 'Payment gateway notification (called by the gateway, not by the apps)',
    description:
      'Authenticated by the gateway signature over the raw body (HyperPay: AES-256-GCM `X-Authentication-Tag` + `X-Initialization-Vector`, body is the encrypted message; the fake gateway: `X-Signature`); a bad or missing signature is 401. The outcome is confirmed with a status query before anything is settled, so a repeated or forged-content notification changes nothing. Unknown sessions are acknowledged. Answers 200 `{settled}`.',
    request: {
      headers: z.object({
        [PAYMENT_WEBHOOK_SIGNATURE_HEADERS[0]]: z.string().optional(),
        [PAYMENT_WEBHOOK_SIGNATURE_HEADERS[1]]: z.string().optional(),
        [PAYMENT_WEBHOOK_IV_HEADER]: z.string().optional(),
      }),
      body: {
        content: {
          'application/json': {
            schema: z.record(z.string(), z.unknown()).describe('Gateway payload'),
          },
        },
      },
    },
    responses: {
      [HTTP_STATUS.ok]: jsonResponse(
        'Acknowledged',
        successResponseSchema(z.object({ settled: z.boolean() })),
      ),
      ...errorResponses(HTTP_STATUS.unauthorized, HTTP_STATUS.serviceUnavailable),
    },
  });
};
