import { lazy } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import { LOGIN_REDIRECT_PARAM, ROUTES } from '@/constants/routes';
import { NAV_ITEMS } from '@/constants/nav';
import { AppShell } from '@/presentation/layout/AppShell';
import { useSession } from '@/presentation/controllers/useSession';
import { ModulePage } from '@/presentation/pages/ModulePage';

const LoginPage = lazy(() => import('@/presentation/pages/LoginPage'));
const NotFoundPage = lazy(() => import('@/presentation/pages/NotFoundPage'));
const AboutPage = lazy(() => import('@/presentation/pages/AboutPage'));
const DesignSystemPage = lazy(() => import('@/presentation/pages/DesignSystemPage'));

export const DESIGN_SYSTEM_PATH = '/design-system';

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
        ...NAV_ITEMS.map((item) => ({ path: item.path, element: <ModulePage path={item.path} /> })),
        { path: ROUTES.about, element: <AboutPage /> },
        ...(showDesignSystem ? [{ path: DESIGN_SYSTEM_PATH, element: <DesignSystemPage /> }] : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}
