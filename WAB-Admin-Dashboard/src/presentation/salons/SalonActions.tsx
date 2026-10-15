import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { SALON_GENDERS, type SalonDetails, type SalonGender } from '@/domain/salons/salons';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

type Open = 'offline' | 'online' | 'gender' | null;

/** Header actions of a salon: offline/online (owner is notified) and change of audience (services switch off). */
export function SalonActions({ salon }: { salon: SalonDetails }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [open, setOpen] = useState<Open>(null);
  const [gender, setGender] = useState<SalonGender>(salon.gender);
  const [reason, setReason] = useState('');
  const [reasonBad, setReasonBad] = useState(false);
  const act = useMutation({
    mutationFn: async ({ kind, why }: { kind: Exclude<Open, null>; why: string }) => {
      const repo = repositories.salons;
      if (kind === 'offline') await repo.setOffline(salon.id, why);
      else if (kind === 'online') await repo.setOnline(salon.id, why);
      else await repo.changeGender(salon.id, gender, why);
    },
    onSuccess: async () => {
      setOpen(null);
      setReason('');
      toast.show(t('salons.actionDone'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getSalons'] });
    },
  });
  const close = () => setOpen(null);
  const saveGender = () => {
    const bad = reasonError(reason) !== undefined || gender === salon.gender;
    setReasonBad(bad);
    if (!bad) act.mutate({ kind: 'gender', why: reason.trim() });
  };
  return (
    <>
      {salon.state === 'LIVE' ? (
        <Button variant="secondary" onClick={() => setOpen('offline')}>
          {t('salons.takeOffline')}
        </Button>
      ) : null}
      {salon.state === 'OFFLINE' ? (
        <Button variant="secondary" onClick={() => setOpen('online')}>
          {t('salons.putOnline')}
        </Button>
      ) : null}
      <Button
        variant="secondary"
        onClick={() => {
          act.reset();
          setGender(salon.gender);
          setReason('');
          setReasonBad(false);
          setOpen('gender');
        }}
      >
        {t('salons.changeGender')}
      </Button>
      <ReasonDialog
        open={open === 'offline' || open === 'online'}
        destructive={open === 'offline'}
        title={t(open === 'offline' ? 'salons.offlineTitle' : 'salons.onlineTitle', {
          name: salon.name,
        })}
        description={t(open === 'offline' ? 'salons.offlineText' : 'salons.onlineText')}
        confirmLabel={t(open === 'offline' ? 'salons.takeOffline' : 'salons.putOnline')}
        loading={act.isPending}
        onConfirm={(why) => open && open !== 'gender' && act.mutate({ kind: open, why })}
        onClose={close}
      />
      {open === 'gender' ? (
        <ResourceDrawer
          title={t('salons.changeGender')}
          reason={reason}
          reasonErr={reasonBad && reasonError(reason) ? 'appConfig.error.reason' : undefined}
          onReason={setReason}
          saving={act.isPending}
          error={act.error}
          onSubmit={saveGender}
          onClose={close}
        >
          <p className="wab-field__hint" role="note">
            {t('salons.genderWarning')}
          </p>
          <Select
            label={t('salons.gender')}
            value={gender}
            options={SALON_GENDERS.map((g) => ({ value: g, label: t(`catalog.genders.${g}`) }))}
            onChange={(e) => setGender(SALON_GENDERS.find((g) => g === e.target.value) ?? gender)}
          />
          {reasonBad && gender === salon.gender ? (
            <p className="wab-field__error" role="alert">
              {t('salons.genderSame')}
            </p>
          ) : null}
        </ResourceDrawer>
      ) : null}
    </>
  );
}
