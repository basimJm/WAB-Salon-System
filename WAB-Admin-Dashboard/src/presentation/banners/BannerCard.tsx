import { useTranslation } from 'react-i18next';
import {
  bannerPhase,
  instantToDate,
  instantToEndDate,
  type Banner,
} from '@/domain/banners/banners';
import { formatNumber } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Icon } from '../components/core/Icon';
import { StatusBadge } from '../components/core/StatusBadge';
import { useLanguage } from '../hooks/useLanguage';

const NO_DATE = '—';

/**
 * Design A24 banner card: artwork area, title + status badge, "target · audience · start → end", Edit. The server
 * has no banner title and no public artwork URL yet (SRV-166), so the title is the order + action and the artwork
 * area shows the stored key of the panel language instead of the picture.
 */
export function BannerCard({
  banner,
  now,
  onEdit,
}: {
  banner: Banner;
  now: Date;
  onEdit: (banner: Banner) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const phase = bannerPhase(banner, now);
  const start = instantToDate(banner.startAt) || NO_DATE;
  const end = instantToEndDate(banner.endAt) || NO_DATE;
  const title = t('banners.cardTitle', {
    order: formatNumber(banner.order, language),
    action: t(`banners.actions.${banner.action}`),
  });
  return (
    <article className="wab-gridcard" aria-label={title}>
      <div className="wab-gridcard__media">
        <Icon name="image" />
        <span>{t('banners.noPreview')}</span>
        <bdi className="wab-gridcard__key" dir="ltr">
          {banner.imageKey[language]}
        </bdi>
      </div>
      <div className="wab-gridcard__body">
        <div className="wab-gridcard__top">
          <span className="wab-gridcard__title">{title}</span>
          {phase === 'INACTIVE' ? (
            <Badge>{t('locations.inactive')}</Badge>
          ) : (
            <StatusBadge kind="placement" value={phase} />
          )}
        </div>
        <span className="wab-gridcard__sub">
          {banner.actionValue ? (
            <>
              <bdi dir="ltr">{banner.actionValue}</bdi>
              {' · '}
            </>
          ) : null}
          {t(`banners.genders.${banner.gender}`)} · <bdi dir="ltr">{`${start} → ${end}`}</bdi>
        </span>
        <div className="wab-gridcard__actions">
          <Button variant="secondary" size="sm" onClick={() => onEdit(banner)}>
            {t('appConfig.edit')}
          </Button>
        </div>
      </div>
    </article>
  );
}
