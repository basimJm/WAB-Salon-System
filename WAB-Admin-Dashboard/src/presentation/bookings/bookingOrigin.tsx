import type { TFunction } from 'i18next';
import { Link as RouterLink } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import type { BookingDetails } from '@/domain/bookings/bookings';
import { Link } from '../components/core/Link';

type Customer = NonNullable<BookingDetails['customer']>;

/** The customer: a link to the account, or (business-made booking, §5.20) the contact without an account. */
export function CustomerValue({ customer, t }: { customer: Customer; t: TFunction }) {
  if (customer.id === null) {
    return (
      <span>
        {customer.name} · {t('bookings.noAccount')}
      </span>
    );
  }
  return <RouterLink to={`${ROUTES.customers}/${customer.id}`}>{customer.name}</RouterLink>;
}

/** Who made the booking (§5.20): the customer app, or the business and the member who did it. */
export const originItems = (
  b: Pick<BookingDetails, 'source' | 'createdBy'>,
  t: TFunction,
): { key: string; label: string; value: string }[] => [
  { key: 'source', label: t('bookings.source'), value: t(`bookings.sources.${b.source}`) },
  ...(b.createdBy === null
    ? []
    : [{ key: 'createdBy', label: t('bookings.createdBy'), value: b.createdBy.name }]),
];

/** A tattoo design image (§5.23): a short-lived signed link opened in a new tab, or nothing. */
export function DesignLink({ url, t }: { url: string | null; t: TFunction }) {
  return url === null ? null : <Link href={url}>{t('bookings.viewDesign')}</Link>;
}
