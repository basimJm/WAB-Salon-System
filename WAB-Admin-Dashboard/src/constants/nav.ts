import { ROUTES, type RoutePath } from './routes';
import type { IconName } from './icons';

export interface NavItem {
  readonly id: string;
  /** i18n key under `nav.` */
  readonly labelKey: string;
  readonly path: RoutePath;
  readonly icon: IconName;
}

/** Sidebar modules in the order of Admin PRD §6. Sub-pages are added by their feature tasks. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'live', labelKey: 'nav.liveOverview', path: ROUTES.liveOverview, icon: 'pulse' },
  { id: 'analytics', labelKey: 'nav.analytics', path: ROUTES.analytics, icon: 'chart' },
  { id: 'journey', labelKey: 'nav.userJourney', path: ROUTES.userJourney, icon: 'route' },
  { id: 'customers', labelKey: 'nav.customers', path: ROUTES.customers, icon: 'users' },
  { id: 'salons', labelKey: 'nav.salons', path: ROUTES.salons, icon: 'store' },
  { id: 'bookings', labelKey: 'nav.bookings', path: ROUTES.bookings, icon: 'calendar' },
  { id: 'finance', labelKey: 'nav.finance', path: ROUTES.finance, icon: 'wallet' },
  { id: 'reviews', labelKey: 'nav.reviews', path: ROUTES.reviews, icon: 'star' },
  { id: 'catalog', labelKey: 'nav.catalog', path: ROUTES.catalog, icon: 'list' },
  { id: 'content', labelKey: 'nav.content', path: ROUTES.content, icon: 'image' },
  { id: 'push', labelKey: 'nav.push', path: ROUTES.push, icon: 'send' },
  { id: 'reports', labelKey: 'nav.reports', path: ROUTES.reports, icon: 'file' },
  { id: 'alerts', labelKey: 'nav.alerts', path: ROUTES.alerts, icon: 'bell' },
  { id: 'settings', labelKey: 'nav.settings', path: ROUTES.settings, icon: 'gear' },
  { id: 'audit', labelKey: 'nav.auditLog', path: ROUTES.auditLog, icon: 'shield' },
];
