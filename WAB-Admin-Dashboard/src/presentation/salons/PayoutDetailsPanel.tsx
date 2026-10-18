import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { isIban } from '@/domain/salons/salons';
import { Button } from '../components/core/Button';
import { KeyValue } from '../components/core/KeyValue';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { TextField } from '../components/form/TextField';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

const KEY = (id: string) => ['getSalonsByIdPayoutDetails', { id }];

/** Bank details for manual payouts. Reading the full IBAN is audited by the server, so it is an explicit click and never cached. */
export function PayoutDetailsPanel({ salonId }: { salonId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [reveal, setReveal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ bankName: '', accountHolderName: '', iban: '', reason: '' });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const details = useQuery({
    queryKey: KEY(salonId),
    queryFn: () => repositories.salons.payoutDetails(salonId),
    enabled: reveal,
    gcTime: 0,
    staleTime: 0,
  });
  const save = useMutation({
    mutationFn: () =>
      repositories.salons.replacePayoutDetails(
        salonId,
        {
          bankName: v.bankName.trim(),
          accountHolderName: v.accountHolderName.trim(),
          iban: v.iban,
        },
        v.reason.trim(),
      ),
    onSuccess: async () => {
      setEditing(false);
      toast.show(t('salons.payoutSaved'), 'success');
      await queryClient.invalidateQueries({ queryKey: KEY(salonId) });
    },
  });
  const submit = () => {
    const found = new Set<string>();
    if (!v.bankName.trim()) found.add('bankName');
    if (!v.accountHolderName.trim()) found.add('accountHolderName');
    if (!isIban(v.iban)) found.add('iban');
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size === 0) save.mutate();
  };
  const field = (k: 'bankName' | 'accountHolderName' | 'iban') => (
    <TextField
      label={t(`salons.${k}`)}
      dir={k === 'iban' ? 'ltr' : undefined}
      value={v[k]}
      error={bad.has(k) ? t(`salons.error.${k}`) : undefined}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
    />
  );
  const d = details.data;
  return (
    <div className="wab-stack">
      <p className="wab-muted">{t('salons.payoutAudit')}</p>
      <div className="wab-row">
        {reveal ? null : (
          <Button variant="secondary" onClick={() => setReveal(true)}>
            {t('salons.showPayout')}
          </Button>
        )}
        <Button
          onClick={() => {
            save.reset();
            setEditing(true);
          }}
        >
          {t('salons.replacePayout')}
        </Button>
      </div>
      {details.error ? <InlineAlert error={details.error} /> : null}
      {reveal && !details.isPending && !details.error ? (
        d ? (
          <KeyValue
            placeholder={t('salons.none')}
            items={[
              { key: 'bank', label: t('salons.bankName'), value: d.bankName },
              { key: 'holder', label: t('salons.accountHolderName'), value: d.accountHolderName },
              {
                key: 'iban',
                label: t('salons.iban'),
                value: d.iban ?? `••••${d.ibanLast4}`,
                ltr: true,
              },
            ]}
          />
        ) : (
          <p>{t('salons.noPayout')}</p>
        )
      ) : null}
      {editing ? (
        <ResourceDrawer
          title={t('salons.replacePayout')}
          reason={v.reason}
          reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
          onReason={(reason) => setV({ ...v, reason })}
          saving={save.isPending}
          error={save.error}
          onSubmit={submit}
          onClose={() => setEditing(false)}
        >
          {field('bankName')}
          {field('accountHolderName')}
          {field('iban')}
        </ResourceDrawer>
      ) : null}
    </div>
  );
}
