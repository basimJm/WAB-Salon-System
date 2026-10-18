import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAYOUT_NOTE, type SalonBalance } from '@/domain/payouts/payouts';
import { formatJodAmount } from '@/domain/shared/format';
import { isLocalDate, localDateOf, localDayRange } from '@/domain/shared/time';
import { KeyValue } from '../components/core/KeyValue';
import { DateField } from '../components/form/DateField';
import { ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { useLanguage } from '../hooks/useLanguage';

/** The payout covers everything up to the end of the chosen Amman day. */
const endOf = (day: string): string => localDayRange(day).end.toISOString();

/** Creates a PENDING payout for one salon up to a day, after showing what the ledger says it is worth. */
export function CreatePayoutDrawer({
  salon,
  onClose,
}: {
  salon: SalonBalance;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [day, setDay] = useState(() => localDateOf(new Date()));
  const [note, setNote] = useState('');
  const [bad, setBad] = useState(false);
  const valid = isLocalDate(day);
  const preview = useQuery({
    queryKey: ['getPayoutsPreview', salon.salonId, day],
    queryFn: () => repositories.payouts.preview(salon.salonId, endOf(day)),
    enabled: valid,
  });
  const create = useMutation({
    mutationFn: () =>
      repositories.payouts.create(salon.salonId, endOf(day), note.trim() || undefined),
    onSuccess: async () => {
      toast.show(t('payouts.created'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getPayouts'] });
      await queryClient.invalidateQueries({ queryKey: ['getPayoutsBalances'] });
      onClose();
    },
  });
  const jod = (v: string) => `${formatJodAmount(v, language)} ${t('common.currency')}`;
  const p = preview.data;
  const submit = () => {
    const invalid = !valid || note.length > MAX_PAYOUT_NOTE;
    setBad(invalid);
    if (!invalid) create.mutate();
  };
  return (
    <ResourceDrawer
      title={t('payouts.createFor', { name: salon.name })}
      reason={note}
      reasonErr={undefined}
      reasonLabel={t('payouts.note')}
      reasonHint={t('payouts.noteHint')}
      onReason={setNote}
      saving={create.isPending}
      error={create.error ?? preview.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <DateField
        label={t('payouts.upTo')}
        value={day}
        onValueChange={setDay}
        error={bad && !valid ? t('payouts.error.day') : undefined}
      />
      {p ? (
        <KeyValue
          placeholder="—"
          items={[
            { key: 'gross', label: t('payouts.gross'), value: jod(p.gross), ltr: true },
            { key: 'fees', label: t('payouts.fees'), value: jod(p.fees), ltr: true },
            { key: 'refunds', label: t('payouts.refunds'), value: jod(p.refunds), ltr: true },
            {
              key: 'adjustments',
              label: t('payouts.adjustments'),
              value: jod(p.adjustments),
              ltr: true,
            },
            { key: 'net', label: t('payouts.net'), value: jod(p.net), ltr: true },
          ]}
        />
      ) : null}
    </ResourceDrawer>
  );
}
