import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { STORAGE_KEYS } from '@/constants/storage';
import { safeStorage } from '@/infrastructure/storage/safeStorage';
import { Suspense } from 'react';
import { Spinner } from '../components/feedback/Spinner';
import { useSession } from '../controllers/useSession';
import { useViewport } from '../hooks/useViewport';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { useBreadcrumbs } from '../controllers/useBreadcrumbs';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const TRUE = 'true';

/** Sidebar is docked (collapsible) on wide screens and a slide-in drawer on tablets/phones. */
export function AppShell() {
  const { breakpoint } = useViewport();
  const { repositories, session, logger } = useContainer();
  const current = useSession();
  const location = useLocation();
  const crumbs = useBreadcrumbs();
  const docked = breakpoint === 'expanded';
  const [collapsed, setCollapsed] = useState(
    () => safeStorage.get(STORAGE_KEYS.sidebarCollapsed) === TRUE,
  );
  // The drawer is tied to the page it was opened on, so navigating (or resizing to docked) closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = !docked && drawerPath === location.pathname;
  const setDrawerOpen = useCallback(
    (open: boolean) => setDrawerPath(open ? location.pathname : null),
    [location.pathname],
  );

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, setDrawerOpen]);

  const onMenu = useCallback(() => {
    if (docked) {
      setCollapsed((prev) => {
        safeStorage.set(STORAGE_KEYS.sidebarCollapsed, String(!prev));
        return !prev;
      });
    } else {
      setDrawerOpen(!drawerOpen);
    }
  }, [docked, drawerOpen, setDrawerOpen]);

  const onLogout = useCallback(() => {
    repositories.auth
      .logout()
      .catch((e: unknown) => logger.warn('logout.failed', { message: String(e) }));
    session.clear();
  }, [repositories, session, logger]);

  return (
    <div className="wab-shell" data-docked={docked} data-collapsed={docked && collapsed}>
      <Sidebar
        mode={docked ? 'docked' : 'drawer'}
        collapsed={collapsed}
        open={drawerOpen}
        onNavigate={() => setDrawerOpen(false)}
      />
      {drawerOpen && !docked ? (
        <button
          type="button"
          className="wab-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <div className="wab-shell__main">
        <Topbar
          adminName={current?.admin.name ?? ''}
          showMenuButton
          menuLabelKey={docked ? 'topbar.toggleSidebar' : 'topbar.openMenu'}
          menuExpanded={docked ? !collapsed : drawerOpen}
          onMenu={onMenu}
          onLogout={onLogout}
        />
        <main id="main" className="wab-content">
          <Breadcrumbs crumbs={crumbs} />
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
