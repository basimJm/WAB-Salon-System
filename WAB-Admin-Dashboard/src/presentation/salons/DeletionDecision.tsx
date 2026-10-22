import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { canDecideDeletion } from '@/domain/salons/salonRules';
import type { DeletionDecision as Decision, SalonDetails } from '@/domain/salons/salons';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';

/** The owner asked to delete the salon: approve (needs no open booking) or reject, with a reason. */
export function DeletionDecision({ salon }: { salon: SalonDetails }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [asking, setAsking] = useState<Decision | null>(null);
  const decide = useMutation({
    mutationFn: (v: { decision: Decision; reason: string }) =>
      repositories.salons.decideDeletion(salon.id, v.decision, v.reason),
    onSuccess: async () => {
      toast.show(t('salons.deletion.done'), 'success');
      setAsking(null);
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getSalons'] });
    },
  });
  if (!canDecideDeletion(salon)) return null;
  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          decide.reset();
          setAsking('APPROVE');
        }}
      >
        {t('salons.deletion.approve')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          decide.reset();
          setAsking('REJECT');
        }}
      >
        {t('salons.deletion.reject')}
      </Button>
      <ReasonDialog
        open={asking !== null}
        destructive={asking === 'APPROVE'}
        title={t(
          asking === 'REJECT' ? 'salons.deletion.rejectTitle' : 'salons.deletion.approveTitle',
          { name: salon.name },
        )}
        description={t(
          asking === 'REJECT' ? 'salons.deletion.rejectText' : 'salons.deletion.approveText',
        )}
        confirmLabel={t(asking === 'REJECT' ? 'salons.deletion.reject' : 'salons.deletion.approve')}
        loading={decide.isPending}
        onConfirm={(reason) => asking && decide.mutate({ decision: asking, reason })}
        onClose={() => setAsking(null)}
      />
      {decide.error ? <p role="alert">{t('salons.deletion.failed')}</p> : null}
    </>
  );
}
