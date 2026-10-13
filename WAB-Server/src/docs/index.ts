import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  API_DOC_VERSION,
  BEARER_SCHEME,
  DOC_NAMES,
  DOC_TITLES,
  OPENAPI_VERSION,
  type DocName,
} from '../constants/docs';
import {
  registerCustomerOtpDocs,
  registerMerchantOtpDocs,
} from '../modules/shared/otp/otp.openapi';
import { registerAdminAuthDocs } from '../modules/admin/auth/auth.openapi';
import { registerMerchantAuthDocs } from '../modules/merchant/auth/auth.openapi';
import { registerCustomerAuthDocs } from '../modules/customer/auth/auth.openapi';
import {
  registerCustomerInstallationDocs,
  registerMerchantInstallationDocs,
} from '../modules/shared/installations/installations.openapi';
import {
  registerCustomerAppConfigDocs,
  registerMerchantAppConfigDocs,
} from '../modules/shared/appConfig/appConfig.openapi';
import {
  registerCustomerLocationDocs,
  registerMerchantLocationDocs,
} from '../modules/shared/locations/locations.openapi';
import {
  registerCustomerContentDocs,
  registerMerchantContentDocs,
} from '../modules/shared/content/content.openapi';
import { registerMerchantSalonDocs } from '../modules/merchant/salon/salon.openapi';
import { registerAdminCatalogDocs } from '../modules/admin/catalog/catalog.openapi';
import {
  registerCustomerCatalogDocs,
  registerMerchantCatalogDocs,
} from '../modules/shared/catalog/catalog.openapi';
import { registerAdminBannerDocs } from '../modules/admin/banners/banners.openapi';
import { registerCustomerBannerDocs } from '../modules/customer/banners/banners.openapi';
import { registerAdminContentDocs } from '../modules/admin/content/content.openapi';
import { registerAdminLocationDocs } from '../modules/admin/locations/locations.openapi';
import { registerHealthDocs } from '../routes/health.openapi';
import { errorResponseSchema, paginationMetaSchema } from './schemas';

type DocumentConfig = Parameters<OpenApiGeneratorV31['generateDocument']>[0];
type Registrar = (registry: OpenAPIRegistry) => void;

/**
 * Add each feature's `register<Feature>Docs` here, under the namespace it belongs to
 * (WAB-Server/CLAUDE.md §11). Order is the order paths appear in the generated files.
 */
const REGISTRARS: Readonly<Record<DocName, readonly Registrar[]>> = {
  common: [registerHealthDocs],
  customer: [registerCustomerOtpDocs, registerCustomerAuthDocs, registerCustomerInstallationDocs, registerCustomerAppConfigDocs, registerCustomerLocationDocs, registerCustomerContentDocs, registerCustomerBannerDocs, registerCustomerCatalogDocs],
  merchant: [registerMerchantOtpDocs, registerMerchantAuthDocs, registerMerchantInstallationDocs, registerMerchantAppConfigDocs, registerMerchantLocationDocs, registerMerchantContentDocs, registerMerchantCatalogDocs, registerMerchantSalonDocs],
  admin: [registerAdminAuthDocs, registerAdminLocationDocs, registerAdminContentDocs, registerAdminBannerDocs, registerAdminCatalogDocs],
};

const buildDocument = (name: DocName): ReturnType<OpenApiGeneratorV31['generateDocument']> => {
  const registry = new OpenAPIRegistry();
  registry.register('ErrorResponse', errorResponseSchema);
  registry.register('PaginationMeta', paginationMetaSchema);
  if (name !== 'common') {
    registry.registerComponent('securitySchemes', BEARER_SCHEME, {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  }
  for (const register of REGISTRARS[name]) register(registry);
  const config: DocumentConfig = {
    openapi: OPENAPI_VERSION,
    info: { title: DOC_TITLES[name], version: API_DOC_VERSION },
    servers: [{ url: '/' }],
    ...(name === 'common' ? {} : { security: [{ [BEARER_SCHEME]: [] }] }),
  };
  return new OpenApiGeneratorV31(registry.definitions).generateDocument(config);
};

export type OpenApiDocument = ReturnType<typeof buildDocument>;

/** One OpenAPI document per name; the single input of Swagger UI, the files and Postman. */
export const buildOpenApiDocuments = (): Record<DocName, OpenApiDocument> =>
  Object.fromEntries(DOC_NAMES.map((name) => [name, buildDocument(name)])) as Record<
    DocName,
    OpenApiDocument
  >;
