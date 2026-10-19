import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { CANCEL_MODES, type BookingDetails, type CancelMode } from '@/domain/bookings/bookings';
import { isRefundAmount, maxRefund } from '@/domain/bookings/bookingRules';
import { formatJodAmount } from '@/domain/shared/format';
import { JodField } from '../components/form/JodField';
import { Select } from '../components/form/Select';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { useLanguage } from '../hooks/useLanguage';

function useDone(messageKey: string, onClose: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  return async () => {
    toast.show(t(messageKey), 'success');
    await queryClient.invalidateQueries({ queryKey: ['getBookingsById'] });
    await queryClient.invalidateQueries({ queryKey: ['getBookings'] });
    onClose();
  };
}

/** Cancels by the rules of the chosen side: the customer's policy, the salon's (full refund) or the admin's own. */
export function CancelDrawer({ b, onClose }: { b: BookingDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [mode, setMode] = useState<CancelMode>('ADMIN');
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const done = useDone('bookings.cancelled', onClose);
  const cancel = useMutation({
    mutationFn: () => repositories.bookings.cancel(b.id, mode, reason.trim()),
    onSuccess: done,
  });
  return (
    <ResourceDrawer
      title={t('bookings.cancelBooking')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={cancel.isPending}
      error={cancel.error}
      onSubmit={() => {
        setTried(true);
        if (!reasonError(reason)) cancel.mutate();
      }}
      onClose={onClose}
    >
      <Select
        label={t('bookings.cancelMode')}
        value={mode}
        options={CANCEL_MODES.map((m) => ({ value: m, label: t(`bookings.mode.${m}`) }))}
        onChange={(e) => setMode(CANCEL_MODES.find((m) => m === e.target.value) ?? mode)}
      />
      <p>{t(`bookings.modeHint.${mode}`)}</p>
    </ResourceDrawer>
  );
}

/** Refunds a chosen amount, never more than what was paid online and not yet refunded. */
export function RefundDrawer({ b, onClose }: { b: BookingDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const max = maxRefund(b.money);
  const [amount, setAmount] = useState(max);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const done = useDone('bookings.refundStarted', onClose);
  const refund = useMutation({
    mutationFn: () => repositories.bookings.refund(b.id, amount, reason.trim()),
    onSuccess: done,
  });
  const amountBad = !isRefundAmount(amount, max);
  return (
    <ResourceDrawer
      title={t('bookings.refund')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={refund.isPending}
      error={refund.error}
      onSubmit={() => {
        setTried(true);
        if (!amountBad && !reasonError(reason)) refund.mutate();
      }}
      onClose={onClose}
    >
      <JodField
        label={t('bookings.refundAmount')}
        currencyLabel={t('common.currency')}
        value={amount}
        hint={t('bookings.refundMax', { max: formatJodAmount(max, language) })}
        error={tried && amountBad ? t('bookings.error.refund') : undefined}
        onValueChange={setAmount}
      />
    </ResourceDrawer>
  );
}
