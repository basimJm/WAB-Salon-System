import { ROUTES, type RoutePath } from './routes';
import type { IconName } from './icons';

export interface NavItem {
  readonly id: string;
  /** i18n key under `nav.` */
  readonly labelKey: string;
  readonly path: RoutePath;
  readonly icon: IconName;
  /** Sub-pages shown under the module (Admin PRD §6). The module itself is the first page. */
  readonly children?: readonly NavChild[];
}

export interface NavChild {
  readonly id: string;
  readonly labelKey: string;
  readonly path: string;
}

/** Sidebar modules in the order of Admin PRD §6. Sub-pages are added by their feature tasks. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'live', labelKey: 'nav.liveOverview', path: ROUTES.liveOverview, icon: 'pulse' },
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    path: ROUTES.analytics,
    icon: 'chart',
    children: [
      { id: 'traffic', labelKey: 'nav.sub.traffic', path: '/analytics/traffic' },
      { id: 'screens', labelKey: 'nav.sub.screens', path: '/analytics/screens' },
      { id: 'funnels', labelKey: 'nav.sub.funnels', path: '/analytics/funnels' },
      { id: 'search', labelKey: 'nav.sub.search', path: '/analytics/search' },
      { id: 'retention', labelKey: 'nav.sub.retention', path: '/analytics/retention' },
      {
        id: 'bookingsAnalytics',
        labelKey: 'nav.sub.bookingsAnalytics',
        path: '/analytics/bookings',
      },
      { id: 'payments', labelKey: 'nav.sub.payments', path: '/analytics/payments' },
      { id: 'errors', labelKey: 'nav.sub.errors', path: '/analytics/errors' },
      { id: 'merchants', labelKey: 'nav.sub.merchants', path: '/analytics/merchants' },
    ],
  },
  { id: 'journey', labelKey: 'nav.userJourney', path: ROUTES.userJourney, icon: 'route' },
  { id: 'customers', labelKey: 'nav.customers', path: ROUTES.customers, icon: 'users' },
  {
    id: 'salons',
    labelKey: 'nav.salons',
    path: ROUTES.salons,
    icon: 'store',
    children: [
      { id: 'allSalons', labelKey: 'nav.sub.allSalons', path: '/salons' },
      { id: 'applications', labelKey: 'nav.sub.applications', path: '/salons/applications' },
    ],
  },
  { id: 'bookings', labelKey: 'nav.bookings', path: ROUTES.bookings, icon: 'calendar' },
  {
    id: 'finance',
    labelKey: 'nav.finance',
    path: ROUTES.finance,
    icon: 'wallet',
    children: [
      { id: 'transactions', labelKey: 'nav.sub.transactions', path: '/finance/transactions' },
      { id: 'refunds', labelKey: 'nav.sub.refunds', path: '/finance/refunds' },
      { id: 'payouts', labelKey: 'nav.sub.payouts', path: '/finance/payouts' },
      { id: 'subscriptions', labelKey: 'nav.sub.subscriptions', path: '/finance/subscriptions' },
      { id: 'reconciliation', labelKey: 'nav.sub.reconciliation', path: '/finance/reconciliation' },
    ],
  },
  { id: 'reviews', labelKey: 'nav.reviews', path: ROUTES.reviews, icon: 'star' },
  {
    id: 'catalog',
    labelKey: 'nav.catalog',
    path: ROUTES.catalog,
    icon: 'grid',
    children: [
      { id: 'services', labelKey: 'nav.sub.services', path: '/catalog' },
      { id: 'requests', labelKey: 'nav.sub.requests', path: '/catalog/requests' },
    ],
  },
  {
    id: 'content',
    labelKey: 'nav.content',
    path: ROUTES.content,
    icon: 'image',
    children: [
      { id: 'banners', labelKey: 'nav.sub.banners', path: '/content' },
      { id: 'recommended', labelKey: 'nav.sub.recommended', path: '/content/recommended' },
      { id: 'legal', labelKey: 'nav.sub.legal', path: '/content/pages' },
      { id: 'faq', labelKey: 'nav.sub.faq', path: '/content/faq' },
      { id: 'contact', labelKey: 'nav.sub.contact', path: '/content/contact' },
    ],
  },
  { id: 'push', labelKey: 'nav.push', path: ROUTES.push, icon: 'send' },
  {
    id: 'reports',
    labelKey: 'nav.reports',
    path: ROUTES.reports,
    icon: 'file',
    children: [
      { id: 'reportsMain', labelKey: 'nav.sub.reportsMain', path: ROUTES.reports },
      { id: 'exports', labelKey: 'nav.sub.exports', path: '/reports/exports' },
    ],
  },
  { id: 'alerts', labelKey: 'nav.alerts', path: ROUTES.alerts, icon: 'bell' },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    path: ROUTES.settings,
    icon: 'gear',
    children: [
      { id: 'general', labelKey: 'nav.sub.general', path: ROUTES.settings },
      { id: 'countries', labelKey: 'nav.sub.countries', path: '/settings/countries' },
      { id: 'cities', labelKey: 'nav.sub.cities', path: '/settings/cities' },
      { id: 'areas', labelKey: 'nav.sub.areas', path: '/settings/areas' },
      { id: 'versions', labelKey: 'nav.sub.versions', path: '/settings/versions' },
      { id: 'maintenance', labelKey: 'nav.sub.maintenance', path: '/settings/maintenance' },
    ],
  },
  { id: 'audit', labelKey: 'nav.auditLog', path: ROUTES.auditLog, icon: 'shield' },
];

/** Every navigable page: the modules and their sub-pages (used to build routes and breadcrumbs). */
export const NAV_PAGES: readonly {
  id: string;
  labelKey: string;
  path: string;
  icon: IconName;
  parentId?: string;
}[] = NAV_ITEMS.flatMap((item) => [
  { id: item.id, labelKey: item.labelKey, path: item.path, icon: item.icon },
  ...(item.children ?? [])
    .filter((child) => child.path !== item.path)
    .map((child) => ({ ...child, icon: item.icon, parentId: item.id })),
]);
