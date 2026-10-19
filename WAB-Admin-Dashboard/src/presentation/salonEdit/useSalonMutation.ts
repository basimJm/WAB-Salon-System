import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/overlay/Toast';

/** A salon edit: runs, tells the admin it was saved and refreshes what it changed (key[0] = operation id). */
export function useSalonMutation<TVariables, TResult>(
  run: (variables: TVariables) => Promise<TResult>,
  refresh: readonly QueryKey[],
  onDone?: (result: TResult) => void,
) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      toast.show(t('salonEdit.saved'), 'success');
      await Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onDone?.(result);
    },
  });
}
