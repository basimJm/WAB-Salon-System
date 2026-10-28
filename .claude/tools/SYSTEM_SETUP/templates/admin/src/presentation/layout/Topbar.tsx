import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { GlobalSearch, type GlobalSearchProps } from '../components/layout/GlobalSearch';
import { Menu } from '../components/overlay/Menu';
import { Icon } from '../components/core/Icon';
import { IconButton } from '../components/core/IconButton';
import { useTheme } from '@/design/theme/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { AdminAvatar } from './AdminAvatar';
import { AlertsBell } from './AlertsBell';

export interface TopbarProps {
  adminName: string;
  /** Shown under the name in the admin menu. */
  adminEmail?: string;
  showMenuButton: boolean;
  menuLabelKey: string;
  menuExpanded: boolean;
  onMenu: () => void;
  onLogout: () => void;
  /** Global search; the box is shown only when the data source for it exists (global-search task). */
  search?: GlobalSearchProps['search'];
  /** Alerts still NEW: the bell counter; the bell opens the latest ones (design dropdown). */
  alertCount?: number;
}

/** Design `WAB Admin Topbar`: search with Cmd+K, language, theme, alerts bell and the admin menu. */
export function Topbar({
  adminName,
  adminEmail,
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
  const name = adminName || t('topbar.adminMenu');
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
      <button
        type="button"
        className="wab-topbtn wab-topbtn--text"
        aria-label={t('topbar.language')}
        title={t('topbar.language')}
        onClick={toggleLanguage}
      >
        {t('topbar.otherLanguageShort')}
      </button>
      <IconButton
        className="wab-topbtn"
        icon={theme === 'dark' ? 'sun' : 'moon'}
        label={t(theme === 'dark' ? 'topbar.lightTheme' : 'topbar.darkTheme')}
        onClick={toggleTheme}
      />
      <AlertsBell count={alertCount ?? 0} />
      <Menu
        label={name}
        triggerClassName="wab-topbar__admin"
        trigger={
          <>
            <AdminAvatar name={name} small />
            <span className="wab-topbar__admin-name">{name}</span>
            <Icon name="chevronDown" size="sm" />
          </>
        }
        header={
          <>
            <span className="wab-menu__header-name">{name}</span>
            {adminEmail ? (
              <span className="wab-menu__header-email" dir="ltr">
                {adminEmail}
              </span>
            ) : null}
          </>
        }
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
