import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { useToast } from '../components/overlay/Toast';

/** Decide one review or a selection; every success refreshes the lists and clears the selection. */
export function useReviewActions(selected: ReadonlySet<string>, onDone: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const repo = repositories.reviews;
  const refresh = async () => {
    onDone();
    await queryClient.invalidateQueries({ queryKey: ['getReviews'] });
  };
  const decide = useMutation({
    mutationFn: async (a: {
      kind: 'approve' | 'reject' | 'remove';
      id: string;
      reason?: string;
    }) => {
      if (a.kind === 'approve') await repo.approve(a.id);
      else if (a.kind === 'reject') await repo.reject(a.id, a.reason);
      else await repo.remove(a.id, a.reason ?? '');
    },
    onSuccess: async () => {
      toast.show(t('reviews.done'), 'success');
      await refresh();
    },
  });
  const bulk = useMutation({
    mutationFn: (a: { decision: 'approve' | 'reject'; reason?: string }) =>
      repo.bulk([...selected], a.decision, a.reason),
    onSuccess: async (results) => {
      const failed = results.filter((r) => !r.ok).length;
      toast.show(
        failed
          ? t('reviews.bulkPartial', { ok: results.length - failed, failed })
          : t('reviews.done'),
        failed ? 'info' : 'success',
      );
      await refresh();
    },
  });
  return { decide, bulk };
}
