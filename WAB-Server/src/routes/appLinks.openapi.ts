import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ANDROID_APP_NAMESPACE,
  ANDROID_HANDLE_ALL_URLS,
  APP_LINKS_CONTENT_TYPES,
  APP_LINKS_PATHS,
  APP_LINKS_SALON_DOC_PATH,
} from '../constants/appLinks';
import { HTTP_STATUS } from '../constants/http';
import { acceptLanguageHeader, errorResponses, jsonResponse } from '../docs/schemas';
import { z } from '../docs/zod';

const assetLinksSchema = z.array(
  z.object({
    relation: z.array(z.literal(ANDROID_HANDLE_ALL_URLS)),
    target: z.object({
      namespace: z.literal(ANDROID_APP_NAMESPACE),
      package_name: z.string(),
      sha256_cert_fingerprints: z.array(z.string()),
    }),
  }),
);

const aasaSchema = z.object({
  applinks: z.object({
    details: z.array(
      z.object({
        appIDs: z.array(z.string()),
        components: z.array(z.object({ '/': z.string() })),
      }),
    ),
  }),
});

const PLATFORM_NOTE =
  'Platform format, not the base envelope. Public; always 200, never redirected.';

export const registerAppLinksDocs = (registry: OpenAPIRegistry): void => {
  registry.registerPath({
    method: 'get',
    path: APP_LINKS_PATHS.assetLinks,
    tags: ['App links'],
    summary: 'Android App Links verification (Digital Asset Links)',
    description: `One entry per configured Android package. ${PLATFORM_NOTE}`,
    responses: { [HTTP_STATUS.ok]: jsonResponse('Asset links', assetLinksSchema) },
  });
  registry.registerPath({
    method: 'get',
    path: APP_LINKS_PATHS.appleAppSiteAssociation,
    tags: ['App links'],
    summary: 'iOS Universal Links verification (apple-app-site-association)',
    description: `Configured app IDs claim the salon path. ${PLATFORM_NOTE}`,
    responses: { [HTTP_STATUS.ok]: jsonResponse('Apple app site association', aasaSchema) },
  });
  registry.registerPath({
    method: 'get',
    path: APP_LINKS_SALON_DOC_PATH,
    tags: ['App links'],
    summary: 'Shared salon link: fallback page for a phone without the app',
    description:
      'Small localized HTML page (noindex) with store buttons. The app opens this URL directly when installed.',
    request: {
      headers: z.object({ 'Accept-Language': acceptLanguageHeader }),
      params: z.object({ salonId: z.string() }),
    },
    responses: {
      [HTTP_STATUS.ok]: {
        description: 'Fallback page',
        content: { [APP_LINKS_CONTENT_TYPES.htmlMedia]: { schema: z.string() } },
      },
      ...errorResponses(HTTP_STATUS.notFound),
    },
  });
};
