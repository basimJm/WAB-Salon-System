import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { BRANCHES_QUERY } from '@/constants/branches';
import type { BranchScope } from '@/domain/salonEdit/salonEdit';
import { branchName, sortBranches, type Branch } from '@/domain/shared/branches';
import { Select } from '../components/form/Select';
import { useLanguage } from '../hooks/useLanguage';

export interface BranchSelection {
  scope: BranchScope;
  /** Open (non-closed) branches, main first. */
  open: readonly Branch[];
  pick: (branchId: string) => void;
}

/** Which branch the branch-scoped tabs edit: the main branch until the admin picks another one. */
export function useBranchSelection(salonId: string): BranchSelection {
  const { repositories } = useContainer();
  const { language } = useLanguage();
  const branches = useQuery({
    queryKey: [BRANCHES_QUERY, { id: salonId }],
    queryFn: () => repositories.branches.list(salonId),
  });
  const open = sortBranches(branches.data ?? [], language).filter((b) => b.status !== 'CLOSED');
  const [picked, setPicked] = useState('');
  const branchId = open.find((b) => b.id === picked)?.id ?? open[0]?.id;
  return { scope: { salonId, ...(branchId ? { branchId } : {}) }, open, pick: setPicked };
}

export function BranchPicker({ selection }: { selection: BranchSelection }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (selection.open.length === 0) return null;
  return (
    <div className="wab-stack">
      <Select
        label={t('salonEdit.branch')}
        value={selection.scope.branchId ?? ''}
        options={selection.open.map((b) => ({ value: b.id, label: branchName(b.name, language) }))}
        onChange={(e) => selection.pick(e.target.value)}
      />
      <p className="wab-field__hint">{t('salonEdit.branchHint')}</p>
    </div>
  );
}
