import { useTranslation } from 'react-i18next';
import { SESSION_IDLE_MINUTES } from '@/constants/auth';
import { BRAND_MARK, BRAND_TAGLINE } from '@/constants/ui';
import { Icon } from '../../components/core/Icon';

/** Brand side of the login screen (Design Script A00). Collapses to a slim header on small screens. */
export function BrandPanel() {
  const { t } = useTranslation();
  return (
    <aside className="wab-brand">
      <div className="wab-brand__top">
        <span className="wab-logo wab-logo--on-brand">{BRAND_MARK}</span>
        <div className="wab-brand__names">
          <span className="wab-brand__tagline">{BRAND_TAGLINE}</span>
          <span className="wab-brand__admin">{t('app.adminLabel')}</span>
        </div>
      </div>
      <div className="wab-brand__copy">
        <h2 className="wab-brand__headline">{t('login.brand.headline')}</h2>
        <p className="wab-brand__text">{t('login.brand.text')}</p>
      </div>
      <p className="wab-brand__security">
        <Icon name="shield" size="sm" />
        {t('login.brand.security', { minutes: SESSION_IDLE_MINUTES })}
      </p>
    </aside>
  );
}
