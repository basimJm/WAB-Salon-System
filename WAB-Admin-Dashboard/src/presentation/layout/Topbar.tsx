import { useTranslation } from 'react-i18next';
import { Button } from '../components/core/Button';
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
}

export function Topbar({
  adminName,
  showMenuButton,
  menuLabelKey,
  menuExpanded,
  onMenu,
  onLogout,
}: TopbarProps) {
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
      <span className="wab-topbar__spacer" />
      <IconButton icon="bell" label={t('topbar.alerts')} />
      <IconButton icon="globe" label={t('topbar.language')} onClick={toggleLanguage} />
      <IconButton
        icon={theme === 'dark' ? 'sun' : 'moon'}
        label={t(theme === 'dark' ? 'topbar.lightTheme' : 'topbar.darkTheme')}
        onClick={toggleTheme}
      />
      <span className="wab-topbar__admin">{adminName}</span>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        {t('topbar.logout')}
      </Button>
    </header>
  );
}
