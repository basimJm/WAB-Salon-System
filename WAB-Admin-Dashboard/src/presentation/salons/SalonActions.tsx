import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import type { SalonDetails } from '@/domain/salons/salons';
import { canChangeAudience } from '@/domain/shared/businessType';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { AudienceDrawer } from './AudienceDrawer';

type Open = 'offline' | 'online' | 'audience' | null;

/** Header actions of a salon: offline/online (owner is notified) and, for a SALON, the audience change (§5.19). */
export function SalonActions({ salon }: { salon: SalonDetails }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [open, setOpen] = useState<Open>(null);
  const act = useMutation({
    mutationFn: async ({ kind, why }: { kind: 'offline' | 'online'; why: string }) => {
      const repo = repositories.salons;
      if (kind === 'offline') await repo.setOffline(salon.id, why);
      else await repo.setOnline(salon.id, why);
    },
    onSuccess: async () => {
      setOpen(null);
      toast.show(t('salons.actionDone'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getSalons'] });
    },
  });
  const close = () => setOpen(null);
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
        <Button variant="secondary" onClick={() => setOpen('audience')}>
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
      {open === 'audience' ? <AudienceDrawer salon={salon} onClose={close} /> : null}
    </>
  );
}
