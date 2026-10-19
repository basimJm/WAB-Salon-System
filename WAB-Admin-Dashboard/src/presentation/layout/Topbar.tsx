import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { GlobalSearch, type GlobalSearchProps } from '../components/layout/GlobalSearch';
import { LiveIndicator } from '../components/feedback/LiveIndicator';
import { Menu } from '../components/overlay/Menu';
import { IconButton } from '../components/core/IconButton';
import { useTheme } from '@/design/theme/useTheme';
import { useLanguage } from '../hooks/useLanguage';

export interface TopbarProps {
  adminName: string;
  showMenuButton: boolean;
  menuLabelKey: string;
  menuExpanded: boolean;
  onMenu: () => void;
  onLogout: () => void;
  /** Global search; the box is shown only when the data source for it exists (global-search task). */
  search?: GlobalSearchProps['search'];
  /** Alerts still NEW: shown on the bell, which opens the alerts page. */
  alertCount?: number;
}

export function Topbar({
  adminName,
  showMenuButton,
  menuLabelKey,
  menuExpanded,
  onMenu,
  onLogout,
  search,
  alertCount,
}: TopbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toggle: toggleLanguage } = useLanguage();
  return (
    <header className="wab-topbar">
      {showMenuButton ? (
        <IconButton
          icon="menu"
          label={t(menuLabelKey)}
          aria-expanded={menuExpanded}
          onClick={onMenu}
        />
      ) : null}
      {search ? <GlobalSearch search={search} onSelect={(hit) => void navigate(hit.to)} /> : null}
      <span className="wab-topbar__spacer" />
      <LiveIndicator />
      <IconButton
        icon="bell"
        label={t('topbar.alerts')}
        {...(alertCount !== undefined ? { badge: alertCount } : {})}
        onClick={() => void navigate(ROUTES.alerts)}
      />
      <IconButton icon="globe" label={t('topbar.language')} onClick={toggleLanguage} />
      <IconButton
        icon={theme === 'dark' ? 'sun' : 'moon'}
        label={t(theme === 'dark' ? 'topbar.lightTheme' : 'topbar.darkTheme')}
        onClick={toggleTheme}
      />
      <Menu
        label={adminName || t('topbar.adminMenu')}
        variant="ghost"
        items={[
          {
            key: 'profile',
            label: t('topbar.profile'),
            onSelect: () => void navigate(ROUTES.profile),
          },
          { key: 'about', label: t('topbar.about'), onSelect: () => void navigate(ROUTES.about) },
          { key: 'logout', label: t('topbar.logout'), onSelect: onLogout, danger: true },
        ]}
      />
    </header>
  );
}
