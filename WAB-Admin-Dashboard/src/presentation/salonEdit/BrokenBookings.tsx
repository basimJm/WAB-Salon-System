import { useTranslation } from 'react-i18next';
import { formatInstant } from '@/domain/shared/format';
import type { BrokenBooking } from '@/domain/salonEdit/salonEdit';
import { useLanguage } from '../hooks/useLanguage';

/** The bookings a schedule change would break (preview answer): shown before the admin confirms. */
export function BrokenBookings({ bookings }: { bookings: readonly BrokenBooking[] | undefined }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (!bookings) return null;
  if (bookings.length === 0) return <p role="status">{t('salonEdit.noConflicts')}</p>;
  return (
    <div role="status">
      <p>{t('salonEdit.conflicts', { count: bookings.length })}</p>
      <ul>
        {bookings.map((b) => (
          <li key={b.bookingId}>
            <span dir="ltr">{formatInstant(b.startsAt, language, 'dateTime')}</span> ·{' '}
            {t(`status.booking.${b.status}`, { defaultValue: b.status })}
          </li>
        ))}
      </ul>
    </div>
  );
}
