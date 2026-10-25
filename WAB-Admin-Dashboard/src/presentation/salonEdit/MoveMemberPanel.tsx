import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MEMBERS_QUERY } from '@/constants/branches';
import type { BranchScope } from '@/domain/salonEdit/salonEdit';
import { branchName, type Branch } from '@/domain/shared/branches';
import { Button } from '../components/core/Button';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Select } from '../components/form/Select';
import { useLanguage } from '../hooks/useLanguage';
import { useReasonAction } from '../hooks/useReasonAction';
import { useSalonMutation } from './useSalonMutation';

export interface MoveMemberPanelProps {
  scope: BranchScope;
  memberId: string;
  /** Open branches of the salon; the member's current branch is left out of the choices. */
  branches: readonly Branch[];
}

/** BUSINESS_DOMAIN §5.16: a member works in one branch; moving clears their services (they pick the new ones). */
export function MoveMemberPanel({ scope, memberId, branches }: MoveMemberPanelProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const targets = branches.filter((b) => b.id !== scope.branchId && b.status !== 'CLOSED');
  const [target, setTarget] = useState('');
  const move = useSalonMutation(
    (v: { branchId: string; reason: string }) =>
      repositories.salonEdit.moveMember(scope.salonId, memberId, v.branchId, v.reason),
    [[MEMBERS_QUERY], ['getSalonsByIdMembersByMemberIdStaff']],
    () => setTarget(''),
  );
  const reason = useReasonAction(move.isPending);
  if (targets.length === 0 || memberId === '') return null;
  return (
    <div className="wab-stack">
      <div className="wab-row">
        <Select
          label={t('salonEdit.moveTo')}
          value={target}
          options={[
            { value: '', label: '—' },
            ...targets.map((b) => ({ value: b.id, label: branchName(b.name, language) })),
          ]}
          onChange={(e) => setTarget(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={target === ''}
          onClick={() => reason.ask((r) => move.mutate({ branchId: target, reason: r }))}
        >
          {t('salonEdit.move')}
        </Button>
      </div>
      <p className="wab-field__hint">{t('salonEdit.moveHint')}</p>
      {move.error ? <InlineAlert error={move.error} /> : null}
      {reason.dialog}
    </div>
  );
}
