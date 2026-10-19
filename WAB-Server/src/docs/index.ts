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
import { registerMerchantBookingDocs } from '../modules/merchant/bookings/bookings.openapi';
import { registerMerchantGalleryDocs } from '../modules/merchant/gallery/gallery.openapi';
import { registerMerchantPolicyDocs } from '../modules/merchant/policy/policy.openapi';
import { registerMerchantLeavesDocs } from '../modules/merchant/team/leaves.openapi';
import { registerMerchantStaffDocs } from '../modules/merchant/team/staff.openapi';
import { registerMerchantTeamDocs } from '../modules/merchant/team/team.openapi';
import { registerMerchantServicesDocs } from '../modules/merchant/services/services.openapi';
import { registerMerchantHoursDocs } from '../modules/merchant/hours/hours.openapi';
import { registerMerchantProfileDocs } from '../modules/merchant/salon/profile.openapi';
import { registerMerchantSalonDocs } from '../modules/merchant/salon/salon.openapi';
import {
  registerAdminUploadDocs,
  registerCustomerUploadDocs,
  registerMerchantUploadDocs,
} from '../modules/shared/uploads/uploads.openapi';
import { registerCustomerSalonDetailsDocs } from '../modules/customer/salonDetails/salonDetails.openapi';
import { registerCustomerHomeDocs } from '../modules/customer/home/home.openapi';
import { API_PREFIXES } from '../constants/server';
import { registerNotificationDocs } from '../modules/shared/notifications/notifications.openapi';
import { registerCustomerFavoritesDocs } from '../modules/customer/favorites/favorites.openapi';
import { registerCustomerReviewDocs } from '../modules/customer/reviews/reviews.openapi';
import { registerCustomerProfileDocs } from '../modules/customer/profile/profile.openapi';
import { registerCustomerAvailabilityDocs } from '../modules/customer/availability/availability.openapi';
import { registerCustomerBookingDraftDocs } from '../modules/customer/bookingDrafts/drafts.openapi';
import { registerCustomerBookingDocs } from '../modules/customer/bookings/bookings.openapi';
import { registerCustomerSearchDocs } from '../modules/customer/search/search.openapi';
import { registerAdminSalonsDocs } from '../modules/admin/salons/adminSalons.openapi';
import { registerAdminSalonStateDocs } from '../modules/admin/salons/salonState.openapi';
import {
  registerAdminCatalogRequestDocs,
  registerMerchantCatalogRequestDocs,
} from '../modules/admin/catalogRequests/requests.openapi';
import { registerAdminCustomerDocs } from '../modules/admin/customers/customers.openapi';
import { registerAdminSettingsDocs } from '../modules/admin/settings/settings.openapi';
import { registerAdminProfileDocs } from '../modules/admin/profile/profile.openapi';
import { registerAdminSearchDocs } from '../modules/admin/search/search.openapi';
import { registerAdminCampaignDocs } from '../modules/admin/campaigns/campaigns.openapi';
import { registerAdminPlacementDocs } from '../modules/admin/placements/placements.openapi';
import {
  registerAdminBookingQueryDocs,
  registerCustomerBookingQueryDocs,
  registerMerchantBookingQueryDocs,
} from '../modules/shared/bookings/bookingQuery.openapi';
import { registerCustomerPaymentDocs } from '../modules/customer/payments/payments.openapi';
import { registerPaymentWebhookDocs } from '../modules/webhooks/webhooks.openapi';
import {
  registerAdminPayoutDetailsDocs,
  registerMerchantPayoutDetailsDocs,
} from '../modules/merchant/payoutDetails/payoutDetails.openapi';
import { registerMerchantFinanceDocs } from '../modules/merchant/finance/finance.openapi';
import { registerAdminSubscriptionDocs } from '../modules/admin/subscriptions/subscriptions.openapi';
import { registerAdminExportDocs } from '../modules/admin/exports/exports.openapi';
import { registerAdminReportDocs } from '../modules/admin/reports/reports.openapi';
import { registerAdminAlertDocs } from '../modules/admin/alerts/alerts.openapi';
import { registerAdminAnalyticsDocs } from '../modules/admin/analytics/analytics.openapi';
import { registerAdminFinanceDocs } from '../modules/admin/finance/transactions.openapi';
import { registerAdminPayoutDocs } from '../modules/admin/payouts/payouts.openapi';
import { registerAdminRefundDocs } from '../modules/admin/refunds/refunds.openapi';
import { registerAdminReviewDocs } from '../modules/admin/reviews/reviews.openapi';
import { registerAdminApplicationDocs } from '../modules/admin/applications/applications.openapi';
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
  common: [registerHealthDocs, registerPaymentWebhookDocs],
  customer: [registerCustomerOtpDocs, registerCustomerAuthDocs, registerCustomerInstallationDocs, registerCustomerAppConfigDocs, registerCustomerLocationDocs, registerCustomerContentDocs, registerCustomerBannerDocs, registerCustomerCatalogDocs, registerCustomerUploadDocs, registerCustomerSearchDocs, registerCustomerSalonDetailsDocs, registerCustomerHomeDocs, registerCustomerFavoritesDocs, registerCustomerReviewDocs, registerCustomerProfileDocs, registerCustomerAvailabilityDocs, registerCustomerBookingDraftDocs, registerCustomerBookingDocs, registerCustomerBookingQueryDocs, registerCustomerPaymentDocs, registerNotificationDocs(API_PREFIXES.customer, 'S19')],
  merchant: [registerMerchantOtpDocs, registerMerchantAuthDocs, registerMerchantInstallationDocs, registerMerchantAppConfigDocs, registerMerchantLocationDocs, registerMerchantContentDocs, registerMerchantCatalogDocs, registerMerchantSalonDocs, registerMerchantProfileDocs, registerMerchantUploadDocs, registerMerchantGalleryDocs, registerMerchantHoursDocs, registerMerchantServicesDocs, registerMerchantCatalogRequestDocs, registerMerchantTeamDocs, registerMerchantStaffDocs, registerMerchantLeavesDocs, registerMerchantPolicyDocs, registerMerchantBookingDocs, registerMerchantBookingQueryDocs, registerMerchantPayoutDetailsDocs, registerMerchantFinanceDocs, registerNotificationDocs(API_PREFIXES.merchant, 'M24')],
  admin: [registerAdminAuthDocs, registerAdminLocationDocs, registerAdminContentDocs, registerAdminBannerDocs, registerAdminCatalogDocs, registerAdminApplicationDocs, registerAdminSalonStateDocs, registerAdminSalonsDocs, registerAdminUploadDocs, registerAdminCatalogRequestDocs, registerAdminReviewDocs, registerAdminPlacementDocs, registerAdminBookingQueryDocs, registerAdminRefundDocs, registerAdminPayoutDocs, registerAdminFinanceDocs, registerAdminAnalyticsDocs, registerAdminAlertDocs, registerAdminReportDocs, registerAdminExportDocs, registerAdminSubscriptionDocs, registerAdminPayoutDetailsDocs, registerAdminCampaignDocs, registerAdminCustomerDocs, registerAdminSettingsDocs, registerAdminProfileDocs, registerAdminSearchDocs],
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
