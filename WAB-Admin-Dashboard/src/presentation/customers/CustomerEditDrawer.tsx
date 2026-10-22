import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  draftOf,
  profilePatch,
  profileProblems,
  type ProfileDraft,
  type ProfileField,
} from '@/domain/customers/customerRules';
import type { CustomerDetails } from '@/domain/customers/customers';
import { SALON_GENDERS } from '@/domain/salons/salons';
import { Select } from '../components/form/Select';
import { TextField } from '../components/form/TextField';
import { reasonError, ResourceDrawer } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { useLocationOptions } from '../hooks/useLocationOptions';

/** Corrects a customer's name, email, gender, city or language (audited; the customer is told). */
export function CustomerEditDrawer({ c, onClose }: { c: CustomerDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const cities = useLocationOptions('cities');
  const [d, setD] = useState<ProfileDraft>(() => draftOf(c));
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const patch = profilePatch(c, d);
  const save = useMutation({
    mutationFn: () => repositories.customers.update(c.id, patch, reason.trim()),
    onSuccess: async () => {
      toast.show(t('customers.saved'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getCustomersById'] });
      await queryClient.invalidateQueries({ queryKey: ['getCustomers'] });
      onClose();
    },
  });
  const bad = profileProblems(d);
  const err = (f: ProfileField) => (tried && bad.has(f) ? t(`customers.error.${f}`) : undefined);
  const submit = () => {
    setTried(true);
    if (bad.size === 0 && Object.keys(patch).length > 0 && !reasonError(reason)) save.mutate();
  };
  return (
    <ResourceDrawer
      title={t('customers.edit')}
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={save.isPending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('customers.firstName')}
        value={d.firstName}
        error={err('firstName')}
        onChange={(e) => setD({ ...d, firstName: e.target.value })}
      />
      <TextField
        label={t('customers.lastName')}
        value={d.lastName}
        error={err('lastName')}
        onChange={(e) => setD({ ...d, lastName: e.target.value })}
      />
      <TextField
        label={t('customers.email')}
        type="email"
        dir="ltr"
        value={d.email}
        error={err('email')}
        onChange={(e) => setD({ ...d, email: e.target.value.trim() })}
      />
      <Select
        label={t('salons.gender')}
        value={d.gender}
        options={SALON_GENDERS.map((g) => ({ value: g, label: t(`catalog.genders.${g}`) }))}
        onChange={(e) =>
          setD({ ...d, gender: SALON_GENDERS.find((g) => g === e.target.value) ?? d.gender })
        }
      />
      <Select
        label={t('salons.city')}
        value={d.cityId}
        options={cities}
        onChange={(e) => setD({ ...d, cityId: e.target.value })}
      />
      <Select
        label={t('customers.language')}
        value={d.language}
        options={[
          { value: 'ar', label: t('customers.languageName.ar') },
          { value: 'en', label: t('customers.languageName.en') },
        ]}
        onChange={(e) => setD({ ...d, language: e.target.value === 'en' ? 'en' : 'ar' })}
      />
      {tried && Object.keys(patch).length === 0 ? (
        <p role="alert">{t('customers.nothingChanged')}</p>
      ) : null}
    </ResourceDrawer>
  );
}
