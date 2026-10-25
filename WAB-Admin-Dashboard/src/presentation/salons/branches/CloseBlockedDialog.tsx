import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { Button } from '../../components/core/Button';
import { Link } from '../../components/core/Link';
import { Modal } from '../../components/overlay/Modal';

export interface CloseBlockedDialogProps {
  name: string;
  /** Upcoming (PENDING/APPROVED) bookings the server listed; the dialog is open while there are any. */
  bookingIds: readonly string[];
  onClose: () => void;
}

/** 409 BRANCH_HAS_UPCOMING_BOOKINGS: which bookings must be cancelled or completed before the branch can close. */
export function CloseBlockedDialog({ name, bookingIds, onClose }: CloseBlockedDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={bookingIds.length > 0}
      title={t('branches.blocked.title', { name })}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t('branches.blocked.ok')}</Button>}
    >
      <p className="wab-modal__text">{t('branches.blocked.text')}</p>
      <ul className="wab-stack">
        {bookingIds.map((id) => (
          <li key={id}>
            <Link to={`${ROUTES.bookings}/${id}`}>{t('branches.blocked.open', { id })}</Link>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
