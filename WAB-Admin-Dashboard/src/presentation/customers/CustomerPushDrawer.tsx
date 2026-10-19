import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { pushProblems, type PushField } from '@/domain/customers/customerRules';
import type { CustomerDetails } from '@/domain/customers/customers';
import { TextArea } from '../components/form/TextArea';
import { TextField } from '../components/form/TextField';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

/** One push (and in-app notification) to this customer, in both languages. */
export function CustomerPushDrawer({ c, onClose }: { c: CustomerDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { repositories } = useContainer();
  const [v, setV] = useState({ titleAr: '', titleEn: '', bodyAr: '', bodyEn: '', link: '' });
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const input = {
    title: { ar: v.titleAr, en: v.titleEn },
    body: { ar: v.bodyAr, en: v.bodyEn },
    ...(v.link.trim() ? { link: v.link.trim() } : {}),
  };
  const bad = pushProblems(input);
  const send = useMutation({
    mutationFn: () => repositories.customers.push(c.id, input, reason.trim()),
    onSuccess: () => {
      toast.show(t('customers.pushSent'), 'success');
      onClose();
    },
  });
  const err = (f: PushField) => (tried && bad.has(f) ? t(`customers.pushError.${f}`) : undefined);
  const submit = () => {
    setTried(true);
    if (bad.size === 0 && !reasonError(reason)) send.mutate();
  };
  return (
    <ResourceDrawer
      title={t('customers.sendPush')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={send.isPending}
      error={send.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('customers.titleAr')}
        dir="rtl"
        value={v.titleAr}
        error={err('titleAr')}
        onChange={(e) => setV({ ...v, titleAr: e.target.value })}
      />
      <TextField
        label={t('customers.titleEn')}
        dir="ltr"
        value={v.titleEn}
        error={err('titleEn')}
        onChange={(e) => setV({ ...v, titleEn: e.target.value })}
      />
      <TextArea
        label={t('customers.bodyAr')}
        dir="rtl"
        rows={3}
        value={v.bodyAr}
        error={err('bodyAr')}
        onChange={(e) => setV({ ...v, bodyAr: e.target.value })}
      />
      <TextArea
        label={t('customers.bodyEn')}
        dir="ltr"
        rows={3}
        value={v.bodyEn}
        error={err('bodyEn')}
        onChange={(e) => setV({ ...v, bodyEn: e.target.value })}
      />
      <TextField
        label={t('customers.link')}
        dir="ltr"
        hint={t('customers.linkHint')}
        value={v.link}
        error={err('link')}
        onChange={(e) => setV({ ...v, link: e.target.value })}
      />
    </ResourceDrawer>
  );
}
