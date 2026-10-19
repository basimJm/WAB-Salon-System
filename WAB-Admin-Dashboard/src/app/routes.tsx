import { type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import { lazyPage } from './lazyPage';
import { DESIGN_SYSTEM_PATH, LOGIN_REDIRECT_PARAM, ROUTES } from '@/constants/routes';
import { NAV_PAGES } from '@/constants/nav';
import { RouteErrorPage } from '@/presentation/pages/RouteErrorPage';
import { AppShell } from '@/presentation/layout/AppShell';
import { useSession } from '@/presentation/controllers/useSession';
import { ModulePage } from '@/presentation/pages/ModulePage';

const LoginPage = lazyPage(() => import('@/presentation/pages/LoginPage'));
const NotFoundPage = lazyPage(() => import('@/presentation/pages/NotFoundPage'));
const ForbiddenPage = lazyPage(() => import('@/presentation/pages/ForbiddenPage'));
const ServerErrorPage = lazyPage(() => import('@/presentation/pages/ServerErrorPage'));
/** Feature pages that replace the placeholder of their nav entry (one line per finished module task). */
const FEATURE_PAGES: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  [ROUTES.settings]: lazyPage(() => import('@/presentation/settings/SettingsPage')),
  '/settings/countries': lazyPage(() => import('@/presentation/locations/CountriesPage')),
  '/settings/cities': lazyPage(() => import('@/presentation/locations/CitiesPage')),
  '/settings/areas': lazyPage(() => import('@/presentation/locations/AreasPage')),
  '/content/pages': lazyPage(() => import('@/presentation/content/LegalPagesPage')),
  '/content/faq': lazyPage(() => import('@/presentation/content/FaqPage')),
  '/content/contact': lazyPage(() => import('@/presentation/content/ContactPage')),
  [ROUTES.content]: lazyPage(() => import('@/presentation/banners/BannersPage')),
  [ROUTES.catalog]: lazyPage(() => import('@/presentation/catalog/CatalogPage')),
  '/catalog/requests': lazyPage(() => import('@/presentation/catalog/RequestsPage')),
  [ROUTES.salons]: lazyPage(() => import('@/presentation/salons/SalonsPage')),
  '/salons/applications': lazyPage(() => import('@/presentation/applications/ApplicationsPage')),
  [ROUTES.customers]: lazyPage(() => import('@/presentation/customers/CustomersPage')),
  [ROUTES.bookings]: lazyPage(() => import('@/presentation/bookings/BookingsPage')),
  [ROUTES.reviews]: lazyPage(() => import('@/presentation/reviews/ReviewsPage')),
  '/finance/transactions': lazyPage(() => import('@/presentation/transactions/TransactionsPage')),
  '/finance/refunds': lazyPage(() => import('@/presentation/refunds/RefundsPage')),
  '/finance/payouts': lazyPage(() => import('@/presentation/payouts/PayoutsPage')),
  '/finance/reconciliation': lazyPage(
    () => import('@/presentation/transactions/ReconciliationPage'),
  ),
  '/finance/subscriptions': lazyPage(
    () => import('@/presentation/subscriptions/SubscriptionsPage'),
  ),
  '/content/recommended': lazyPage(() => import('@/presentation/placements/PlacementsPage')),
  [ROUTES.push]: lazyPage(() => import('@/presentation/campaigns/CampaignsPage')),
  [ROUTES.alerts]: lazyPage(() => import('@/presentation/alerts/AlertsPage')),
  [ROUTES.liveOverview]: lazyPage(() => import('@/presentation/analytics/LiveOverviewPage')),
  '/analytics/bookings': lazyPage(() => import('@/presentation/analytics/BookingsAnalyticsPage')),
  '/analytics/payments': lazyPage(() => import('@/presentation/analytics/PaymentsAnalyticsPage')),
  '/analytics/errors': lazyPage(() => import('@/presentation/analytics/ErrorsAnalyticsPage')),
  [ROUTES.reports]: lazyPage(() => import('@/presentation/reports/ReportsPage')),
  [ROUTES.auditLog]: lazyPage(() => import('@/presentation/audit/AuditPage')),
  '/reports/exports': lazyPage(() => import('@/presentation/exports/ExportsPage')),
  '/settings/versions': lazyPage(() => import('@/presentation/appconfig/VersionsPage')),
  '/settings/maintenance': lazyPage(() => import('@/presentation/appconfig/MaintenancePage')),
};
/** Record pages with a path parameter (opened from a list row). */
const DETAIL_PAGES: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  [`${ROUTES.salons}/applications/:id`]: lazyPage(
    () => import('@/presentation/applications/ApplicationReviewPage'),
  ),
  [`${ROUTES.customers}/:id`]: lazyPage(
    () => import('@/presentation/customers/CustomerDetailsPage'),
  ),
  [`${ROUTES.bookings}/:id`]: lazyPage(() => import('@/presentation/bookings/BookingDetailsPage')),
  '/finance/transactions/:id': lazyPage(
    () => import('@/presentation/transactions/TransactionDetailsPage'),
  ),
  [`${ROUTES.salons}/:id`]: lazyPage(() => import('@/presentation/salons/SalonDetailsPage')),
  [`${ROUTES.salons}/:id/edit`]: lazyPage(() => import('@/presentation/salonEdit/SalonEditPage')),
};
const ProfilePage = lazyPage(() => import('@/presentation/profile/ProfilePage'));
const AboutPage = lazyPage(() => import('@/presentation/pages/AboutPage'));
/** Compile-time: `__SHOW_DESIGN_SYSTEM__` is false in prod builds, so the whole gallery chunk is dropped. */
const DesignSystemPage = __SHOW_DESIGN_SYSTEM__
  ? lazyPage(() => import('@/presentation/pages/DesignSystemPage'))
  : null;

function pageFor(path: string) {
  const Feature = FEATURE_PAGES[path];
  return Feature ? <Feature /> : <ModulePage path={path} />;
}

function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (session) return <AppShell />;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`${ROUTES.login}?${LOGIN_REDIRECT_PARAM}=${next}`} replace />;
}

/** Route table. The design-system gallery exists only when `showDesignSystem` (dev builds). */
export function buildRoutes(showDesignSystem: boolean): RouteObject[] {
  const errorElement = <RouteErrorPage />;
  return [
    { path: ROUTES.login, element: <LoginPage />, errorElement },
    {
      element: <RequireAuth />,
      errorElement,
      children: [
        { index: true, element: <Navigate to={ROUTES.liveOverview} replace /> },
        ...NAV_PAGES.map((item) => ({ path: item.path, element: pageFor(item.path) })),
        ...Object.entries(DETAIL_PAGES).map(([path, Page]) => ({ path, element: <Page /> })),
        { path: ROUTES.forbidden, element: <ForbiddenPage /> },
        { path: ROUTES.serverError, element: <ServerErrorPage /> },
        { path: ROUTES.about, element: <AboutPage /> },
        { path: ROUTES.profile, element: <ProfilePage /> },
        ...(showDesignSystem && DesignSystemPage
          ? [{ path: DESIGN_SYSTEM_PATH, element: <DesignSystemPage /> }]
          : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
