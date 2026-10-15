import core from './en/core.json';
import login from './en/login.json';
import media from './en/media.json';
import filters from './en/filters.json';
import errors from './en/errors.json';
import designKits from './en/designKits.json';
import design from './en/design.json';
import forms from './en/forms.json';
import settings from './en/settings.json';
import locations from './en/locations.json';
import appConfig from './en/appConfig.json';
import content from './en/content.json';
import banners from './en/banners.json';
import catalog from './en/catalog.json';
import salons from './en/salons.json';
import applications from './en/applications.json';
import customers from './en/customers.json';
import bookings from './en/bookings.json';
import reviews from './en/reviews.json';
import transactions from './en/transactions.json';
import status from './en/status.json';

/** Every area file of this language, merged. A new area = a new file here and in the other language. */
/**
 * Gallery strings (areas `design`, `designKits`) exist only in dev builds: the flag is a compile-time constant,
 * so prod bundles drop them. The type stays complete for the code that renders the gallery.
 */
const gallery = (__SHOW_DESIGN_SYSTEM__ ? { ...design, ...designKits } : {}) as typeof design &
  typeof designKits;

const en = {
  ...core,
  ...login,
  ...errors,
  ...filters,
  ...media,
  ...gallery,
  ...forms,
  ...status,
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

export default en;
