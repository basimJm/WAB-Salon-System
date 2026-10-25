import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { BRANCHES_QUERY, MAX_BRANCHES_SETTING, MEMBERS_QUERY } from '@/constants/branches';
import { SETTINGS_QUERY_KEY } from '@/constants/settings';
import {
  sortBranches,
  staffCountByBranch,
  type Branch,
  type BranchInput,
  type BranchPatch,
} from '@/domain/shared/branches';
import { formatNumber } from '@/domain/shared/format';
import { Button } from '../../components/core/Button';
import { DataTable } from '../../components/data/DataTable';
import { InlineAlert } from '../../components/feedback/InlineAlert';
import { useToast } from '../../components/overlay/Toast';
import { useAreaOptions } from '../../hooks/useAreaOptions';
import { useLanguage } from '../../hooks/useLanguage';
import { branchColumns } from './branchColumns';
import { BranchDrawer } from './BranchDrawer';
import { useBranchActions } from './useBranchActions';

type Save =
  | { kind: 'create'; input: BranchInput; reason: string }
  | {
      kind: 'update';
      id: string;
      patch: BranchPatch;
      reason: string;
    };

/** Admin PRD A13 (branches, BUSINESS_DOMAIN §5.16): every branch of the salon with full CRUD and state changes. */
export function BranchesTab({ salonId }: { salonId: string }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState<Branch | 'new' | null>(null);
  const list = useQuery({
    queryKey: [BRANCHES_QUERY, { id: salonId }],
    queryFn: () => repositories.branches.list(salonId),
  });
  const members = useQuery({
    queryKey: [MEMBERS_QUERY, { id: salonId }],
    queryFn: () => repositories.salons.members(salonId),
  });
  const settings = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => repositories.settings.list(),
  });
  const areas = useAreaOptions();
  const actions = useBranchActions(salonId);
  const save = useMutation({
    mutationFn: (v: Save) =>
      v.kind === 'create'
        ? repositories.branches.create(salonId, v.input, v.reason)
        : repositories.branches.update(salonId, v.id, v.patch, v.reason),
    onSuccess: async () => {
      setOpen(null);
      toast.show(t('branches.done'), 'success');
      await queryClient.invalidateQueries({ queryKey: [BRANCHES_QUERY] });
      await queryClient.invalidateQueries({ queryKey: ['getSalonsById'] });
    },
  });
  const staff = staffCountByBranch(members.data ?? []);
  const rows = sortBranches(list.data ?? [], language);
  const openCount = rows.filter((b) => b.status !== 'CLOSED').length;
  const max = settings.data?.find((s) => s.key === MAX_BRANCHES_SETTING)?.value;
  const columns = branchColumns({
    t,
    language,
    areaName: (id) => areas.find((a) => a.value === id)?.label,
    staffOf: (id) => staff.get(id) ?? 0,
  });
  const close = () => {
    setOpen(null);
    save.reset();
  };
  return (
    <div className="wab-stack">
      <div className="wab-row">
        {typeof max === 'number' && list.data ? (
          <span className="wab-muted">
            {t('branches.count', {
              count: formatNumber(openCount, language),
              max: formatNumber(max, language),
            })}
          </span>
        ) : null}
        <Button
          disabled={typeof max === 'number' && openCount >= max}
          onClick={() => {
            save.reset();
            setOpen('new');
          }}
        >
          {t('branches.add')}
        </Button>
      </div>
      {actions.error ? <InlineAlert error={actions.error} /> : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        caption={t('branches.tab')}
        loading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle={t('branches.empty')}
        rowActions={(b) => actions.menuFor(b, () => setOpen(b))}
      />
      {actions.dialogs}
      {open ? (
        <BranchDrawer
          key={open === 'new' ? 'new' : open.id}
          branch={open === 'new' ? null : open}
          saving={save.isPending}
          error={save.error}
          onCreate={(input, reason) => save.mutate({ kind: 'create', input, reason })}
          onUpdate={(patch, reason) =>
            open !== 'new' && save.mutate({ kind: 'update', id: open.id, patch, reason })
          }
          onClose={close}
        />
      ) : null}
    </div>
  );
}
