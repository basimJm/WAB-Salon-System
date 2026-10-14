import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { BRAND_MARK, SIDEBAR_DRAWER_ID } from '@/constants/ui';
import { cx } from '../utils/cx';
import { Icon } from '../components/core/Icon';

export interface SidebarProps {
  mode: 'docked' | 'drawer';
  collapsed: boolean;
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ mode, collapsed, open, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const shrink = mode === 'docked' && collapsed;
  return (
    <aside
      id={SIDEBAR_DRAWER_ID}
      className={cx(
        'wab-sidebar',
        `wab-sidebar--${mode}`,
        shrink && 'wab-sidebar--collapsed',
        open && 'wab-sidebar--open',
      )}
      aria-label={t('nav.label')}
      // A closed drawer is off-canvas: keep it out of the tab order and the accessibility tree.
      inert={mode === 'drawer' && !open}
    >
      <div className="wab-sidebar__brand">
        <span className="wab-logo">{BRAND_MARK}</span>
        {!shrink ? <span className="wab-sidebar__admin">{t('app.adminLabel')}</span> : null}
      </div>
      <nav className="wab-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => cx('wab-navitem', isActive && 'wab-navitem--active')}
            title={shrink ? t(item.labelKey) : undefined}
          >
            <Icon name={item.icon} />
            {!shrink ? <span className="wab-navitem__label">{t(item.labelKey)}</span> : null}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to={ROUTES.about}
        onClick={onNavigate}
        className={({ isActive }) =>
          cx('wab-navitem', 'wab-sidebar__about', isActive && 'wab-navitem--active')
        }
        title={shrink ? t('about.link') : undefined}
      >
        <Icon name="info" />
        {!shrink ? <span className="wab-navitem__label">{t('about.link')}</span> : null}
      </NavLink>
    </aside>
  );
}
