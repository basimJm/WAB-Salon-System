import core from './ar/core.json';
import login from './ar/login.json';
import media from './ar/media.json';
import filters from './ar/filters.json';
import errors from './ar/errors.json';
import designKits from './ar/designKits.json';
import design from './ar/design.json';
import forms from './ar/forms.json';
import settings from './ar/settings.json';
import locations from './ar/locations.json';
import appConfig from './ar/appConfig.json';
import content from './ar/content.json';
import banners from './ar/banners.json';
import catalog from './ar/catalog.json';
import salons from './ar/salons.json';
import applications from './ar/applications.json';
import customers from './ar/customers.json';
import bookings from './ar/bookings.json';
import reviews from './ar/reviews.json';
import transactions from './ar/transactions.json';
import refunds from './ar/refunds.json';
import payouts from './ar/payouts.json';
import reconciliation from './ar/reconciliation.json';
import subscriptions from './ar/subscriptions.json';
import placements from './ar/placements.json';
import campaigns from './ar/campaigns.json';
import alerts from './ar/alerts.json';
import overview from './ar/overview.json';
import reports from './ar/reports.json';
import audit from './ar/audit.json';
import status from './ar/status.json';

/** Every area file of this language, merged. A new area = a new file here and in the other language. */
/**
 * Gallery strings (areas `design`, `designKits`) exist only in dev builds: the flag is a compile-time constant,
 * so prod bundles drop them. The type stays complete for the code that renders the gallery.
 */
const gallery = (__SHOW_DESIGN_SYSTEM__ ? { ...design, ...designKits } : {}) as typeof design &
  typeof designKits;

const ar = {
  ...core,
  ...login,
  ...errors,
  ...filters,
  ...media,
  ...gallery,
  ...forms,
  ...status,
  ...audit,
  ...reports,
  ...overview,
  ...alerts,
  ...campaigns,
  ...placements,
  ...subscriptions,
  ...reconciliation,
  ...payouts,
  ...refunds,
  ...transactions,
  ...reviews,
  ...bookings,
  ...customers,
  ...applications,
  ...salons,
  ...catalog,
  ...banners,
  ...content,
  ...appConfig,
  ...locations,
  ...settings,
};

export default ar;
