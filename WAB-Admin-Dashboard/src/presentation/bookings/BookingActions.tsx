import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canCancel, canReassign, canRefund } from '@/domain/bookings/bookingRules';
import type { BookingDetails } from '@/domain/bookings/bookings';
import { Button } from '../components/core/Button';
import { CancelDrawer, RefundDrawer } from './CancelRefundDrawers';
import { ReassignDrawer } from './ReassignDrawer';

type Open = 'status' | 'reassign' | 'cancel' | 'refund' | null;

/** The buttons of the booking page; each opens its own audited form (reason required). */
export function BookingActions({ b, onStatus }: { b: BookingDetails; onStatus: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  return (
    <>
      <Button variant="secondary" onClick={onStatus}>
        {t('bookings.changeStatus')}
      </Button>
      {canReassign(b) ? (
        <Button variant="secondary" onClick={() => setOpen('reassign')}>
          {t('bookings.reassign')}
        </Button>
      ) : null}
      {canRefund(b) ? (
        <Button variant="secondary" onClick={() => setOpen('refund')}>
          {t('bookings.refund')}
        </Button>
      ) : null}
      {canCancel(b) ? (
        <Button variant="danger" onClick={() => setOpen('cancel')}>
          {t('bookings.cancelBooking')}
        </Button>
      ) : null}
      {open === 'reassign' ? <ReassignDrawer b={b} onClose={close} /> : null}
      {open === 'cancel' ? <CancelDrawer b={b} onClose={close} /> : null}
      {open === 'refund' ? <RefundDrawer b={b} onClose={close} /> : null}
    </>
  );
}
