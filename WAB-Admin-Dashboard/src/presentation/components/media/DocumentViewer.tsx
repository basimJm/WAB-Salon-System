import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from '@/constants/media';
import { formatNumber } from '@/domain/shared/format';
import { useLanguage } from '../../hooks/useLanguage';
import { rotateLeft, rotateRight, zoomIn, zoomOut } from '../../utils/mediaMath';
import { isPrivateFileUrl } from '../../utils/safeHref';
import { Button } from '../core/Button';

export interface DocumentViewerProps {
  /** Short-lived signed URL of a private file (license, ID). Never stored by the viewer. */
  url: string;
  kind: 'image' | 'pdf';
  /** Accessible name of the document ("License document of Layla Beauty"). */
  label: string;
  /** File name offered when downloading. */
  filename: string;
}

/** Private document viewer: zoom and rotate images, open or download PDFs. Only https signed URLs are used. */
export function DocumentViewer({ url, kind, label, filename }: DocumentViewerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [angle, setAngle] = useState(0);
  if (!isPrivateFileUrl(url)) return <p role="alert">{t('media.unsafeUrl')}</p>;

  return (
    <div className="wab-docviewer">
      <div className="wab-row" role="toolbar" aria-label={t('media.viewerTools')}>
        {kind === 'image' ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoom(zoomOut)}
              disabled={zoom <= ZOOM_MIN}
            >
              {t('media.zoomOut')}
            </Button>
            <span className="wab-docviewer__zoom" aria-live="polite">
              {formatNumber(Math.round(zoom * 100), language)}%
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoom(zoomIn)}
              disabled={zoom >= ZOOM_MAX}
            >
              {t('media.zoomIn')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAngle(rotateLeft)}>
              {t('media.rotateLeft')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAngle(rotateRight)}>
              {t('media.rotate')}
            </Button>
          </>
        ) : null}
        <a
          className="wab-link"
          href={url}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('media.download')}
        </a>
      </div>
      {kind === 'image' ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard reachable
        <div className="wab-docviewer__stage" role="region" tabIndex={0} aria-label={label}>
          <img
            src={url}
            alt={label}
            className="wab-docviewer__image"
            style={{ transform: `rotate(${String(angle)}deg) scale(${String(zoom)})` }}
          />
        </div>
      ) : (
        <object className="wab-docviewer__pdf" data={url} type="application/pdf" aria-label={label}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {t('media.openPdf')}
          </a>
        </object>
      )}
    </div>
  );
}
