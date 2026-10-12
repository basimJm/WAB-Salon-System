/** API documentation constants (SRV-008). */
export const DOC_NAMES = ['common', 'customer', 'merchant', 'admin'] as const;
export type DocName = (typeof DOC_NAMES)[number];

export const OPENAPI_VERSION = '3.1.0';
export const API_DOC_VERSION = '1.0.0';
export const DOCS_ROUTE = '/docs';
export const DOCS_OUTPUT_DIR = 'docs/api';
export const POSTMAN_OUTPUT_DIR = 'docs/api/postman';
export const POSTMAN_SCHEMA_URL =
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

export const DOC_TITLES: Readonly<Record<DocName, string>> = {
  common: 'WAB Common',
  customer: 'WAB Customer API',
  merchant: 'WAB Merchant API',
  admin: 'WAB Admin API',
};

export const BEARER_SCHEME = 'bearerAuth';

/** Postman collection variables. Values are filled by the developer, never committed. */
export const POSTMAN_VARIABLES = {
  baseUrl: 'baseUrl',
  language: 'language',
  tokens: {
    common: '',
    customer: 'customerToken',
    merchant: 'merchantToken',
    admin: 'adminToken',
  },
} as const;
export const POSTMAN_DEFAULT_LANGUAGE = 'ar';
export const POSTMAN_ENVIRONMENT_NAME = 'WAB Local';
export const JSON_CONTENT_TYPE = 'application/json';
export const SCHEMA_REF_PREFIX = '#/components/schemas/';
export const MAX_EXAMPLE_DEPTH = 6;
