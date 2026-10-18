import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAYOUT_NOTE, MAX_TRANSFER_REFERENCE, type Payout } from '@/domain/payouts/payouts';
import { isJodString } from '@/domain/shared/money';
import { isLocalDate, localDateOf, zonedTimeToUtc } from '@/domain/shared/time';
import { DateField } from '../components/form/DateField';
import { TextField } from '../components/form/TextField';
import { ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

const NOON = 12 * 60;

/** Records the bank transfer made by hand: amount (must be the payout's net), day, bank reference, note. */
export function TransferDrawer({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [v, setV] = useState({
    amount: payout.net,
    day: localDateOf(new Date()),
    reference: '',
    note: '',
  });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const transfer = useMutation({
    mutationFn: () =>
      repositories.payouts.transfer(payout.id, {
        amount: v.amount,
        transferredAt: zonedTimeToUtc(v.day, NOON).toISOString(),
        transferReference: v.reference.trim(),
        note: v.note.trim(),
      }),
    onSuccess: async () => {
      toast.show(t('payouts.transferred'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getPayouts'] });
      await queryClient.invalidateQueries({ queryKey: ['getPayoutsBalances'] });
      onClose();
    },
  });
  const submit = () => {
    const found = new Set<string>();
    if (!isJodString(v.amount) || v.amount !== payout.net) found.add('amount');
    if (!isLocalDate(v.day)) found.add('day');
    if (!v.reference.trim() || v.reference.length > MAX_TRANSFER_REFERENCE) found.add('reference');
    if (!v.note.trim() || v.note.length > MAX_PAYOUT_NOTE) found.add('note');
    setBad(found);
    if (found.size === 0) transfer.mutate();
  };
  const err = (k: string) =>
    bad.has(k) ? t(`payouts.error.${k}`, { net: payout.net }) : undefined;
  return (
    <ResourceDrawer
      title={t('payouts.transferTitle')}
      reason={v.note}
      reasonErr={err('note')}
      reasonLabel={t('payouts.transferNote')}
      reasonHint={t('payouts.transferNoteHint')}
      onReason={(note) => setV({ ...v, note })}
      saving={transfer.isPending}
      error={transfer.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('payouts.amount')}
        dir="ltr"
        value={v.amount}
        error={err('amount')}
        onChange={(e) => setV({ ...v, amount: e.target.value })}
      />
      <DateField
        label={t('payouts.transferDay')}
        value={v.day}
        onValueChange={(day) => setV({ ...v, day })}
        error={err('day')}
      />
      <TextField
        label={t('payouts.reference')}
        dir="ltr"
        value={v.reference}
        error={err('reference')}
        onChange={(e) => setV({ ...v, reference: e.target.value })}
      />
    </ResourceDrawer>
  );
}
