import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import type { SalonDetails } from '@/domain/salons/salons';
import { AUDIENCES, canChangeAudience, type Audience } from '@/domain/shared/businessType';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';

type Open = 'offline' | 'online' | 'audience' | null;

/** Header actions of a salon: offline/online (owner is notified) and change of audience (services switch off). */
export function SalonActions({ salon }: { salon: SalonDetails }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [open, setOpen] = useState<Open>(null);
  const [audience, setAudience] = useState<Audience>(salon.audience);
  const [reason, setReason] = useState('');
  const [reasonBad, setReasonBad] = useState(false);
  const act = useMutation({
    mutationFn: async ({ kind, why }: { kind: Exclude<Open, null>; why: string }) => {
      const repo = repositories.salons;
      if (kind === 'offline') await repo.setOffline(salon.id, why);
      else if (kind === 'online') await repo.setOnline(salon.id, why);
      else await repo.changeAudience(salon.id, audience, why);
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
  const saveAudience = () => {
    const bad = reasonError(reason) !== undefined || audience === salon.audience;
    setReasonBad(bad);
    if (!bad) act.mutate({ kind: 'audience', why: reason.trim() });
  };
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => void navigate(`${ROUTES.salons}/${salon.id}/edit`)}
      >
        {t('salonEdit.open')}
      </Button>
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
      {canChangeAudience(salon.businessType) ? (
        <Button
          variant="secondary"
          onClick={() => {
            act.reset();
            setAudience(salon.audience);
            setReason('');
            setReasonBad(false);
            setOpen('audience');
          }}
        >
          {t('salons.changeAudience')}
        </Button>
      ) : null}
      <ReasonDialog
        open={open === 'offline' || open === 'online'}
        destructive={open === 'offline'}
        title={t(open === 'offline' ? 'salons.offlineTitle' : 'salons.onlineTitle', {
          name: salon.name,
        })}
        description={t(open === 'offline' ? 'salons.offlineText' : 'salons.onlineText')}
        confirmLabel={t(open === 'offline' ? 'salons.takeOffline' : 'salons.putOnline')}
        loading={act.isPending}
        onConfirm={(why) => open && open !== 'audience' && act.mutate({ kind: open, why })}
        onClose={close}
      />
      {open === 'audience' ? (
        <ResourceDrawer
          title={t('salons.changeAudience')}
          reason={reason}
          reasonErr={reasonBad && reasonError(reason) ? 'appConfig.error.reason' : undefined}
          onReason={setReason}
          saving={act.isPending}
          error={act.error}
          onSubmit={saveAudience}
          onClose={close}
        >
          <p className="wab-field__hint" role="note">
            {t('salons.audienceWarning')}
          </p>
          <Select
            label={t('business.audience')}
            value={audience}
            options={AUDIENCES.map((a) => ({ value: a, label: t(`status.audience.${a}`) }))}
            onChange={(e) => setAudience(AUDIENCES.find((a) => a === e.target.value) ?? audience)}
          />
          {reasonBad && audience === salon.audience ? (
            <p className="wab-field__error" role="alert">
              {t('salons.audienceSame')}
            </p>
          ) : null}
        </ResourceDrawer>
      ) : null}
    </>
  );
}
