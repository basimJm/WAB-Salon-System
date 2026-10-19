import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  CANCELLATION_MAX_HOURS,
  policyProblems,
  type PolicyProblem,
} from '@/domain/salonEdit/rules';
import {
  FULL_PAYMENT_REFUNDS,
  NO_SHOW_DEPOSITS,
  NO_SHOW_FULL_PAYMENTS,
  PAYMENT_OPTIONS,
  type PolicyInput,
  type SalonPolicy,
} from '@/domain/salonEdit/salonEdit';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { NumberField } from '../components/form/NumberField';
import { Select } from '../components/form/Select';
import { TextArea } from '../components/form/TextArea';
import { Toggle } from '../components/form/Toggle';
import { useReasonAction } from '../hooks/useReasonAction';
import { useSalonMutation } from './useSalonMutation';

const DEFAULT: PolicyInput = {
  cancellationWindowHours: 0,
  paymentOptions: ['PAY_ON_ARRIVAL'],
  depositRefundableOnCustomerCancel: false,
  fullPaymentRefundOnCustomerCancel: 'FULL',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'KEEP',
};

const toInput = (p: SalonPolicy | null): PolicyInput =>
  p
    ? {
        cancellationWindowHours: p.cancellationWindowHours,
        paymentOptions: p.paymentOptions,
        ...(p.depositPercentage !== null ? { depositPercentage: p.depositPercentage } : {}),
        depositRefundableOnCustomerCancel: p.depositRefundableOnCustomerCancel,
        fullPaymentRefundOnCustomerCancel: p.fullPaymentRefundOnCustomerCancel,
        noShowDeposit: p.noShowDeposit,
        noShowFullPayment: p.noShowFullPayment,
        ...(p.notes ? { notes: p.notes } : {}),
      }
    : DEFAULT;

const options = (t: (k: string) => string, prefix: string, values: readonly string[]) =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));

function PolicyForm({ salonId, policy }: { salonId: string; policy: SalonPolicy | null }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [v, setV] = useState<PolicyInput>(toInput(policy));
  const [tried, setTried] = useState(false);
  const save = useSalonMutation(
    (reason: string) => repositories.salonEdit.savePolicy(salonId, v, reason),
    [['getSalonsByIdPolicy']],
  );
  const reason = useReasonAction(save.isPending);
  const bad = new Set<PolicyProblem>(policyProblems(v));
  const err = (k: PolicyProblem) =>
    tried && bad.has(k)
      ? t(`salonEdit.error.policy.${k}`, { max: CANCELLATION_MAX_HOURS })
      : undefined;
  const toggleOption = (o: (typeof PAYMENT_OPTIONS)[number], on: boolean) =>
    setV({
      ...v,
      paymentOptions: on ? [...v.paymentOptions, o] : v.paymentOptions.filter((x) => x !== o),
    });
  const { depositPercentage, notes, ...rest } = v;
  return (
    <Card aria-label={t('salonEdit.tab.policy')}>
      <div className="wab-stack">
        <fieldset>
          <legend>{t('salonEdit.paymentOptions')}</legend>
          {PAYMENT_OPTIONS.map((o) => (
            <Toggle
              key={o}
              label={t(`salonEdit.payment.${o}`)}
              checked={v.paymentOptions.includes(o)}
              onChange={(e) => toggleOption(o, e.target.checked)}
            />
          ))}
          {err('options') ? (
            <p className="wab-field__error" role="alert">
              {err('options')}
            </p>
          ) : null}
        </fieldset>
        {v.paymentOptions.includes('DEPOSIT') ? (
          <NumberField
            label={t('salonEdit.depositPercentage')}
            value={depositPercentage ?? null}
            decimals={0}
            error={err('deposit')}
            onValueChange={(n) => setV(n === null ? rest : { ...v, depositPercentage: n })}
          />
        ) : null}
        <NumberField
          label={t('salonEdit.cancellationWindow')}
          value={v.cancellationWindowHours}
          decimals={0}
          error={err('window')}
          onValueChange={(n) => setV({ ...v, cancellationWindowHours: n ?? 0 })}
        />
        <Toggle
          label={t('salonEdit.depositRefundable')}
          checked={v.depositRefundableOnCustomerCancel}
          onChange={(e) => setV({ ...v, depositRefundableOnCustomerCancel: e.target.checked })}
        />
        <Select
          label={t('salonEdit.fullRefund')}
          value={v.fullPaymentRefundOnCustomerCancel}
          options={options(t, 'salonEdit.fullRefundRule', FULL_PAYMENT_REFUNDS)}
          onChange={(e) =>
            setV({
              ...v,
              fullPaymentRefundOnCustomerCancel:
                FULL_PAYMENT_REFUNDS.find((x) => x === e.target.value) ?? 'FULL',
            })
          }
        />
        <Select
          label={t('salonEdit.noShowDeposit')}
          value={v.noShowDeposit}
          options={options(t, 'salonEdit.noShowDepositRule', NO_SHOW_DEPOSITS)}
          onChange={(e) =>
            setV({
              ...v,
              noShowDeposit: NO_SHOW_DEPOSITS.find((x) => x === e.target.value) ?? 'KEEP',
            })
          }
        />
        <Select
          label={t('salonEdit.noShowFull')}
          value={v.noShowFullPayment}
          options={options(t, 'salonEdit.noShowFullRule', NO_SHOW_FULL_PAYMENTS)}
          onChange={(e) =>
            setV({
              ...v,
              noShowFullPayment: NO_SHOW_FULL_PAYMENTS.find((x) => x === e.target.value) ?? 'KEEP',
            })
          }
        />
        <TextArea
          label={t('salonEdit.policyNotes')}
          rows={3}
          value={notes ?? ''}
          error={err('notes')}
          onChange={(e) =>
            setV(
              e.target.value
                ? { ...v, notes: e.target.value }
                : (({ notes: _n, ...others }) => others)(v),
            )
          }
        />
        {save.error ? <InlineAlert error={save.error} /> : null}
        <div>
          <Button
            loading={save.isPending}
            onClick={() => {
              setTried(true);
              if (bad.size === 0) reason.ask((r) => save.mutate(r));
            }}
          >
            {t('salonEdit.save')}
          </Button>
        </div>
      </div>
      {reason.dialog}
    </Card>
  );
}

export function PolicyTab({ salonId }: { salonId: string }) {
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getSalonsByIdPolicy', salonId],
    queryFn: () => repositories.salonEdit.policy(salonId),
  });
  return (
    <AsyncView
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {q.data !== undefined ? (
        <PolicyForm key={q.dataUpdatedAt} salonId={salonId} policy={q.data} />
      ) : null}
    </AsyncView>
  );
}
