import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { canForceDelete, canPush } from '@/domain/customers/customerRules';
import type { CustomerDetails } from '@/domain/customers/customers';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { CustomerEditDrawer } from './CustomerEditDrawer';
import { CustomerPushDrawer } from './CustomerPushDrawer';

type Open = 'edit' | 'push' | 'force' | null;

/** Edit the profile, send one push, delete the account at once (skips the 30-day grace). */
export function CustomerExtraActions({ c }: { c: CustomerDetails }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const force = useMutation({
    mutationFn: (reason: string) => repositories.customers.forceDelete(c.id, reason),
    onSuccess: async () => {
      toast.show(t('customers.forceDeleted'), 'success');
      close();
      await queryClient.invalidateQueries({ queryKey: ['getCustomersById'] });
      await queryClient.invalidateQueries({ queryKey: ['getCustomers'] });
    },
  });
  return (
    <>
      {c.status !== 'DELETED' ? (
        <Button variant="secondary" onClick={() => setOpen('edit')}>
          {t('customers.edit')}
        </Button>
      ) : null}
      {canPush(c) ? (
        <Button variant="secondary" onClick={() => setOpen('push')}>
          {t('customers.sendPush')}
        </Button>
      ) : null}
      {canForceDelete(c.status) ? (
        <Button variant="danger" onClick={() => setOpen('force')}>
          {t('customers.forceDelete')}
        </Button>
      ) : null}
      {open === 'edit' ? <CustomerEditDrawer c={c} onClose={close} /> : null}
      {open === 'push' ? <CustomerPushDrawer c={c} onClose={close} /> : null}
      <ReasonDialog
        open={open === 'force'}
        destructive
        title={t('customers.forceDeleteTitle', { name: c.name })}
        description={t('customers.forceDeleteText')}
        confirmLabel={t('customers.forceDelete')}
        loading={force.isPending}
        onConfirm={(reason) => force.mutate(reason)}
        onClose={close}
      />
    </>
  );
}
