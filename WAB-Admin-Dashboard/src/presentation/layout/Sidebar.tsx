import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, type NavItem } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { BRAND_MARK, SIDEBAR_DRAWER_ID } from '@/constants/ui';
import { formatNumber } from '@/domain/shared/format';
import { MAX_COUNTER } from '@/constants/ui';
import { useLanguage } from '../hooks/useLanguage';
import { cx } from '../utils/cx';
import { Icon } from '../components/core/Icon';

export interface SidebarProps {
  mode: 'docked' | 'drawer';
  collapsed: boolean;
  open: boolean;
  onNavigate: () => void;
  /** Number to show next to a module or sub-page, by nav id (new applications, open alerts...). Filled by live data. */
  counters?: Readonly<Record<string, number>>;
}

function Counter({ value }: { value: number | undefined }) {
  const { language } = useLanguage();
  if (!value || value <= 0) return null;
  const text =
    value > MAX_COUNTER ? `${formatNumber(MAX_COUNTER, language)}+` : formatNumber(value, language);
  return <span className="wab-navitem__count">{text}</span>;
}

interface GroupProps {
  item: NavItem;
  shrink: boolean;
  counters: Readonly<Record<string, number>>;
  onNavigate: () => void;
}

/** A module with sub-pages: its own link plus a toggle for the sub-menu (open while one of its pages is current). */
function NavGroup({ item, shrink, counters, onNavigate }: GroupProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const children = item.children ?? [];
  const inside = children.some((c) => pathname === c.path) || pathname === item.path;
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = !shrink && (manual ?? inside);
  const total = children.reduce((sum, c) => sum + (counters[c.id] ?? 0), counters[item.id] ?? 0);
  const name = t(item.labelKey);
  return (
    <div className="wab-navgroup">
      <div className="wab-navgroup__head">
        <NavLink
          to={item.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => cx('wab-navitem', isActive && 'wab-navitem--active')}
          title={shrink ? name : undefined}
        >
          <Icon name={item.icon} />
          {!shrink ? <span className="wab-navitem__label">{name}</span> : null}
          {!shrink ? <Counter value={total} /> : null}
        </NavLink>
        {!shrink ? (
          <button
            type="button"
            className="wab-navgroup__toggle"
            aria-expanded={expanded}
            aria-label={t(expanded ? 'nav.collapse' : 'nav.expand', { name })}
            onClick={() => setManual(!expanded)}
          >
            <Icon name="chevronDown" size="sm" />
          </button>
        ) : null}
      </div>
      {expanded ? (
        <ul className="wab-navgroup__list">
          {children.map((child) => (
            <li key={child.id}>
              <NavLink
                to={child.path}
                end
                onClick={onNavigate}
                className={({ isActive }) => cx('wab-navsub', isActive && 'wab-navsub--active')}
              >
                <span className="wab-navitem__label">{t(child.labelKey)}</span>
                <Counter value={counters[child.id]} />
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Sidebar({ mode, collapsed, open, onNavigate, counters = {} }: SidebarProps) {
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
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <NavGroup
              key={item.id}
              item={item}
              shrink={shrink}
              counters={counters}
              onNavigate={onNavigate}
            />
          ) : (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) => cx('wab-navitem', isActive && 'wab-navitem--active')}
              title={shrink ? t(item.labelKey) : undefined}
            >
              <Icon name={item.icon} />
              {!shrink ? <span className="wab-navitem__label">{t(item.labelKey)}</span> : null}
              {!shrink ? <Counter value={counters[item.id]} /> : null}
            </NavLink>
          ),
        )}
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
