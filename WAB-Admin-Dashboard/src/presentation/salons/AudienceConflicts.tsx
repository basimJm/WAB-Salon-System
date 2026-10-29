import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { AUDIENCE_CONFLICTS_SHOWN } from '@/constants/ui';
import { formatInstant } from '@/domain/shared/format';
import { useLanguage } from '../hooks/useLanguage';

/**
 * The future bookings that block narrowing (409 SCHEDULE_CONFLICT, §5.12): each links to its booking, labelled with
 * its reference and time once read; past the first few only a count is shown.
 */
export function AudienceConflicts({ ids }: { ids: readonly string[] }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const shown = ids.slice(0, AUDIENCE_CONFLICTS_SHOWN);
  const bookings = useQueries({
    queries: shown.map((id) => ({
      queryKey: ['getBookingsById', { id }],
      queryFn: () => repositories.bookings.get(id),
    })),
  });
  if (ids.length === 0) return null;
  return (
    <div role="alert" className="wab-stack">
      <p className="wab-field__error">{t('salonAudience.conflicts', { count: ids.length })}</p>
      <ul>
        {shown.map((id, i) => {
          const b = bookings[i]?.data;
          return (
            <li key={id}>
              <RouterLink to={`${ROUTES.bookings}/${id}`}>
                {b ? (
                  <span dir="ltr">
                    {b.referenceNumber} · {formatInstant(b.appointmentStart, language, 'dateTime')}
                  </span>
                ) : (
                  t('salonAudience.conflictBooking', { n: i + 1 })
                )}
              </RouterLink>
            </li>
          );
        })}
      </ul>
      {ids.length > shown.length ? (
        <p>{t('salonAudience.conflictsMore', { count: ids.length - shown.length })}</p>
      ) : null}
    </div>
  );
}
