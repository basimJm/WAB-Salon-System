import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { BRANCHES_QUERY } from '@/constants/branches';
import {
  blockingBookingIds,
  branchActions,
  branchName,
  type Branch,
  type BranchAction,
} from '@/domain/shared/branches';
import { Menu } from '../../components/overlay/Menu';
import { ReasonDialog } from '../../components/overlay/ReasonDialog';
import { useToast } from '../../components/overlay/Toast';
import { useLanguage } from '../../hooks/useLanguage';
import { CloseBlockedDialog } from './CloseBlockedDialog';

const DESTRUCTIVE: ReadonlySet<BranchAction> = new Set(['offline', 'close']);

export interface BranchActionsApi {
  /** The row menu of a branch (null when nothing can be done, e.g. a closed branch). */
  menuFor: (branch: Branch, onEdit: () => void) => ReactNode;
  /** Reason dialog and the "still has bookings" dialog: render once. */
  dialogs: ReactNode;
  /** The last refused action (shown above the table); cleared by the next action. */
  error: unknown;
}

/** Main / offline / online / close, each after a reason; a refused close lists the bookings that block it. */
export function useBranchActions(salonId: string): BranchActionsApi {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<{ branch: Branch; action: BranchAction } | null>(null);
  const [blocked, setBlocked] = useState<{ branch: Branch; ids: string[] } | null>(null);
  const act = useMutation({
    mutationFn: (v: { branch: Branch; action: BranchAction; reason: string }) =>
      repositories.branches.act(salonId, v.branch.id, v.action, v.reason),
    onSuccess: async () => {
      setPending(null);
      toast.show(t('branches.done'), 'success');
      await queryClient.invalidateQueries({ queryKey: [BRANCHES_QUERY] });
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
    },
    onError: (error, v) => {
      setPending(null);
      const ids = blockingBookingIds(error);
      if (ids.length > 0) setBlocked({ branch: v.branch, ids });
    },
  });
  const nameOf = (b: Branch) => branchName(b.name, language);
  const menuFor = (branch: Branch, onEdit: () => void) => {
    const actions = branchActions(branch);
    if (actions.length === 0) return null;
    return (
      <Menu
        label={t('branches.actions')}
        variant="secondary"
        items={[
          { key: 'edit', label: t('branches.edit'), onSelect: onEdit },
          ...actions.map((action) => ({
            key: action,
            label: t(`branches.action.${action}`),
            danger: DESTRUCTIVE.has(action),
            onSelect: () => {
              act.reset();
              setPending({ branch, action });
            },
          })),
        ]}
      />
    );
  };
  const dialogs = (
    <>
      <ReasonDialog
        open={pending !== null}
        destructive={pending ? DESTRUCTIVE.has(pending.action) : false}
        title={
          pending
            ? t(`branches.confirm.${pending.action}.title`, { name: nameOf(pending.branch) })
            : ''
        }
        description={pending ? t(`branches.confirm.${pending.action}.text`) : ''}
        confirmLabel={pending ? t(`branches.action.${pending.action}`) : ''}
        loading={act.isPending}
        onConfirm={(reason) => pending && act.mutate({ ...pending, reason })}
        onClose={() => setPending(null)}
      />
      <CloseBlockedDialog
        name={blocked ? nameOf(blocked.branch) : ''}
        bookingIds={blocked?.ids ?? []}
        onClose={() => {
          setBlocked(null);
          act.reset();
        }}
      />
    </>
  );
  const error = act.error && blockingBookingIds(act.error).length === 0 ? act.error : null;
  return { menuFor, dialogs, error };
}
