import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COORDINATE_DECIMALS, mapLinkOf } from '@/constants/branches';
import {
  BRANCH_ADDRESS_MAX,
  BRANCH_NAME_MAX,
  branchInput,
  branchPatch,
  branchProblems,
  draftOfBranch,
  emptyBranchDraft,
  isEmptyPatch,
  type BranchDraft,
  type BranchField,
} from '@/domain/shared/branchDraft';
import {
  branchName,
  type Branch,
  type BranchInput,
  type BranchPatch,
} from '@/domain/shared/branches';
import { Link } from '../../components/core/Link';
import { NumberField } from '../../components/form/NumberField';
import { TextField } from '../../components/form/TextField';
import { reasonError, ResourceDrawer, Select } from '../../components/overlay/ResourceDrawer';
import { useAreaOptions } from '../../hooks/useAreaOptions';
import { useLanguage } from '../../hooks/useLanguage';
import { useLocationOptions } from '../../hooks/useLocationOptions';

export interface BranchDrawerProps {
  /** null = a new branch. */
  branch: Branch | null;
  saving: boolean;
  error: unknown;
  onCreate: (input: BranchInput, reason: string) => void;
  onUpdate: (patch: BranchPatch, reason: string) => void;
  onClose: () => void;
}

const MAX_OF: Partial<Record<BranchField, number>> = {
  nameAr: BRANCH_NAME_MAX,
  nameEn: BRANCH_NAME_MAX,
  locationText: BRANCH_ADDRESS_MAX,
};

/** Create or edit a branch: names AR/EN, address and map position, city/area, contacts, and the audit reason. */
export function BranchDrawer({
  branch,
  saving,
  error,
  onCreate,
  onUpdate,
  onClose,
}: BranchDrawerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [draft, setDraft] = useState<BranchDraft>(() =>
    branch ? draftOfBranch(branch) : emptyBranchDraft(),
  );
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const cities = useLocationOptions('cities');
  const areas = useAreaOptions(draft.cityId || undefined);
  const bad = branchProblems(draft);
  const patch = branch ? branchPatch(branch, draft) : null;
  const unchanged = patch !== null && isEmptyPatch(patch);
  const err = (f: BranchField) =>
    tried && bad.has(f) ? t(`branches.error.${f}`, { max: MAX_OF[f] }) : undefined;
  const set = (change: Partial<BranchDraft>) => setDraft({ ...draft, ...change });
  const submit = () => {
    setTried(true);
    if (bad.size > 0 || reasonError(reason) || unchanged) return;
    if (patch) onUpdate(patch, reason.trim());
    else onCreate(branchInput(draft), reason.trim());
  };
  const { latitude, longitude } = draft;
  return (
    <ResourceDrawer
      title={
        branch
          ? t('branches.editTitle', { name: branchName(branch.name, language) })
          : t('branches.createTitle')
      }
      reason={reason}
      reasonErr={tried ? reasonError(reason) : undefined}
      onReason={setReason}
      saving={saving}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('branches.nameAr')}
        dir="rtl"
        value={draft.nameAr}
        error={err('nameAr')}
        onChange={(e) => set({ nameAr: e.target.value })}
      />
      <TextField
        label={t('branches.nameEn')}
        dir="ltr"
        value={draft.nameEn}
        error={err('nameEn')}
        onChange={(e) => set({ nameEn: e.target.value })}
      />
      <Select
        label={t('branches.city')}
        value={draft.cityId}
        error={err('cityId')}
        options={[{ value: '', label: '—' }, ...cities]}
        onChange={(e) => set({ cityId: e.target.value, areaId: '' })}
      />
      <Select
        label={t('branches.area')}
        value={draft.areaId}
        error={err('areaId')}
        options={[{ value: '', label: '—' }, ...areas]}
        onChange={(e) => set({ areaId: e.target.value })}
      />
      <TextField
        label={t('branches.address')}
        value={draft.locationText}
        error={err('locationText')}
        onChange={(e) => set({ locationText: e.target.value })}
      />
      <NumberField
        label={t('branches.latitude')}
        hint={t('branches.locationHint')}
        value={latitude}
        decimals={COORDINATE_DECIMALS}
        allowNegative
        error={err('location')}
        onValueChange={(v) => set({ latitude: v })}
      />
      <NumberField
        label={t('branches.longitude')}
        value={longitude}
        decimals={COORDINATE_DECIMALS}
        allowNegative
        onValueChange={(v) => set({ longitude: v })}
      />
      {latitude !== null && longitude !== null && !bad.has('location') ? (
        <Link href={mapLinkOf(latitude, longitude)}>{t('branches.mapLink')}</Link>
      ) : null}
      <TextField
        label={t('branches.phone')}
        dir="ltr"
        value={draft.phone}
        error={err('phone')}
        onChange={(e) => set({ phone: e.target.value.trim() })}
      />
      <TextField
        label={t('branches.whatsapp')}
        dir="ltr"
        value={draft.whatsapp}
        error={err('whatsapp')}
        onChange={(e) => set({ whatsapp: e.target.value.trim() })}
      />
      {tried && unchanged ? (
        <p className="wab-field__error" role="alert">
          {t('branches.error.nothing')}
        </p>
      ) : null}
    </ResourceDrawer>
  );
}
