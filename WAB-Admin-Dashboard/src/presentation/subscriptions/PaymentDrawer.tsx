import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { isJodString } from '@/domain/shared/money';
import { addDays, isLocalDate, localDateOf, localDayRange } from '@/domain/shared/time';
import {
  MAX_METHOD,
  MAX_NOTE,
  MAX_REFERENCE,
  type Subscription,
} from '@/domain/subscriptions/subscriptions';
import { DateField } from '../components/form/DateField';
import { TextField } from '../components/form/TextField';
import { ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

const DEFAULT_PERIOD_DAYS = 30;
const start = (day: string) => localDayRange(day).start.toISOString();

/** Records a subscription payment made outside the app: it activates the salon and extends the paid period. */
export function PaymentDrawer({
  subscription,
  onClose,
}: {
  subscription: Subscription;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const today = localDateOf(new Date());
  const [v, setV] = useState({
    amount: '',
    paidAt: today,
    from: today,
    to: addDays(today, DEFAULT_PERIOD_DAYS),
    method: '',
    reference: '',
    note: '',
  });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const record = useMutation({
    mutationFn: () =>
      repositories.subscriptions.recordPayment(subscription.salonId, {
        amount: v.amount,
        paidAt: start(v.paidAt),
        periodFrom: start(v.from),
        periodTo: start(v.to),
        method: v.method.trim(),
        reference: v.reference.trim(),
        ...(v.note.trim() ? { note: v.note.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.show(t('subscriptions.recorded'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getSubscriptions'] });
      onClose();
    },
  });
  const submit = () => {
    const found = new Set<string>();
    if (!isJodString(v.amount)) found.add('amount');
    if (![v.paidAt, v.from, v.to].every(isLocalDate) || v.to <= v.from) found.add('period');
    if (!v.method.trim() || v.method.length > MAX_METHOD) found.add('method');
    if (!v.reference.trim() || v.reference.length > MAX_REFERENCE) found.add('reference');
    if (v.note.length > MAX_NOTE) found.add('note');
    setBad(found);
    if (found.size === 0) record.mutate();
  };
  const err = (k: string) => (bad.has(k) ? t(`subscriptions.error.${k}`) : undefined);
  return (
    <ResourceDrawer
      title={t('subscriptions.recordFor', { name: subscription.salonName })}
      reason={v.note}
      reasonErr={err('note')}
      reasonLabel={t('subscriptions.note')}
      reasonHint={t('subscriptions.noteHint')}
      onReason={(note) => setV({ ...v, note })}
      saving={record.isPending}
      error={record.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('subscriptions.amount')}
        dir="ltr"
        hint={t('subscriptions.amountHint')}
        value={v.amount}
        error={err('amount')}
        onChange={(e) => setV({ ...v, amount: e.target.value })}
      />
      <DateField
        label={t('subscriptions.paidAt')}
        value={v.paidAt}
        onValueChange={(paidAt) => setV({ ...v, paidAt })}
      />
      <DateField
        label={t('subscriptions.periodFrom')}
        value={v.from}
        onValueChange={(from) => setV({ ...v, from })}
      />
      <DateField
        label={t('subscriptions.periodTo')}
        value={v.to}
        onValueChange={(to) => setV({ ...v, to })}
        error={err('period')}
      />
      <TextField
        label={t('subscriptions.method')}
        value={v.method}
        error={err('method')}
        onChange={(e) => setV({ ...v, method: e.target.value })}
      />
      <TextField
        label={t('subscriptions.reference')}
        dir="ltr"
        value={v.reference}
        error={err('reference')}
        onChange={(e) => setV({ ...v, reference: e.target.value })}
      />
    </ResourceDrawer>
  );
}
