import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/core/Icon';
import { Spinner } from '../components/feedback/Spinner';
import { Popover } from '../components/overlay/Popover';

// The panel (alert rows, relative times, links) loads on first open, keeping it out of the entry bundle.
const BellPanel = lazy(() => import('./AlertsBellPanel'));

/** Design `Admin Topbar` bell: counter of NEW alerts and the dropdown of the latest ones. */
export function AlertsBell({ count = 0 }: { count?: number }) {
  const { t } = useTranslation();
  const label = count > 0 ? `${t('topbar.alerts')} ${String(count)}` : t('topbar.alerts');
  return (
    <Popover
      label={label}
      triggerClassName="app-iconbtn app-topbtn"
      panelClassName="app-popover__panel--bell"
      trigger={
        <>
          <Icon name="bell" />
          {count > 0 ? <span className="app-iconbtn__badge">{count}</span> : null}
        </>
      }
    >
      {(close) => (
        <Suspense fallback={<Spinner />}>
          <BellPanel close={close} />
        </Suspense>
      )}
    </Popover>
  );
}
