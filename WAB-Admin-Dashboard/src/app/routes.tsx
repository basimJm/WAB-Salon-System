import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import { DESIGN_SYSTEM_PATH, LOGIN_REDIRECT_PARAM, ROUTES } from '@/constants/routes';
import { NAV_PAGES } from '@/constants/nav';
import { AppShell } from '@/presentation/layout/AppShell';
import { useSession } from '@/presentation/controllers/useSession';
import { ModulePage } from '@/presentation/pages/ModulePage';

const LoginPage = lazy(() => import('@/presentation/pages/LoginPage'));
const NotFoundPage = lazy(() => import('@/presentation/pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('@/presentation/pages/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('@/presentation/pages/ServerErrorPage'));
/** Feature pages that replace the placeholder of their nav entry (one line per finished module task). */
const FEATURE_PAGES: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  [ROUTES.settings]: lazy(() => import('@/presentation/settings/SettingsPage')),
  '/settings/countries': lazy(() => import('@/presentation/locations/CountriesPage')),
  '/settings/cities': lazy(() => import('@/presentation/locations/CitiesPage')),
  '/settings/areas': lazy(() => import('@/presentation/locations/AreasPage')),
  '/content/pages': lazy(() => import('@/presentation/content/LegalPagesPage')),
  '/content/faq': lazy(() => import('@/presentation/content/FaqPage')),
  '/content/contact': lazy(() => import('@/presentation/content/ContactPage')),
  [ROUTES.content]: lazy(() => import('@/presentation/banners/BannersPage')),
  [ROUTES.catalog]: lazy(() => import('@/presentation/catalog/CatalogPage')),
  '/catalog/requests': lazy(() => import('@/presentation/catalog/RequestsPage')),
  [ROUTES.salons]: lazy(() => import('@/presentation/salons/SalonsPage')),
  '/settings/versions': lazy(() => import('@/presentation/appconfig/VersionsPage')),
  '/settings/maintenance': lazy(() => import('@/presentation/appconfig/MaintenancePage')),
};
/** Record pages with a path parameter (opened from a list row). */
const DETAIL_PAGES: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = {
  [`${ROUTES.salons}/:id`]: lazy(() => import('@/presentation/salons/SalonDetailsPage')),
};
const AboutPage = lazy(() => import('@/presentation/pages/AboutPage'));
/** Compile-time: `__SHOW_DESIGN_SYSTEM__` is false in prod builds, so the whole gallery chunk is dropped. */
const DesignSystemPage = __SHOW_DESIGN_SYSTEM__
  ? lazy(() => import('@/presentation/pages/DesignSystemPage'))
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
  return [
    { path: ROUTES.login, element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        { index: true, element: <Navigate to={ROUTES.liveOverview} replace /> },
        ...NAV_PAGES.map((item) => ({ path: item.path, element: pageFor(item.path) })),
        ...Object.entries(DETAIL_PAGES).map(([path, Page]) => ({ path, element: <Page /> })),
        { path: ROUTES.forbidden, element: <ForbiddenPage /> },
        { path: ROUTES.serverError, element: <ServerErrorPage /> },
        { path: ROUTES.about, element: <AboutPage /> },
        ...(showDesignSystem && DesignSystemPage
          ? [{ path: DESIGN_SYSTEM_PATH, element: <DesignSystemPage /> }]
          : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
