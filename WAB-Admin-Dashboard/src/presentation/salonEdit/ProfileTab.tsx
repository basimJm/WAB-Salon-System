import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  draftOf,
  hasChanges,
  profilePatch,
  profileProblems,
  type ProfileDraft,
  type ProfileField,
} from '@/domain/salonEdit/profileDraft';
import type { SalonProfile } from '@/domain/salonEdit/salonEdit';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { NumberField } from '../components/form/NumberField';
import { Select } from '../components/form/Select';
import { TextArea } from '../components/form/TextArea';
import { TextField } from '../components/form/TextField';
import { ImageUploader } from '../components/media/ImageUploader';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { useReasonAction } from '../hooks/useReasonAction';
import { useSalonMutation } from './useSalonMutation';

const COORDINATE_DECIMALS = 6;

function ProfileForm({ profile }: { profile: SalonProfile }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const cities = useLocationOptions('cities');
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(profile));
  const [tried, setTried] = useState(false);
  const save = useSalonMutation(
    (v: { patch: ReturnType<typeof profilePatch>; reason: string }) =>
      repositories.salonEdit.updateProfile(profile.id, v.patch, v.reason),
    [['getSalonsByIdProfile'], ['getSalonsById']],
  );
  const reason = useReasonAction(save.isPending);
  const bad = profileProblems(draft);
  const err = (field: ProfileField) =>
    tried && bad.has(field) ? t(`salonEdit.error.${field}`) : undefined;
  const patch = profilePatch(profile, draft);
  const set = (change: Partial<ProfileDraft>) => setDraft({ ...draft, ...change });
  const upload =
    (purpose: 'SALON_COVER' | 'SALON_PROFILE') => (file: File, onProgress: (r: number) => void) =>
      repositories.uploads
        .upload(purpose, file, onProgress)
        .then((f) => ({ key: f.key, url: f.url ?? '' }));
  const submit = () => {
    setTried(true);
    if (bad.size === 0 && hasChanges(patch)) reason.ask((r) => save.mutate({ patch, reason: r }));
  };
  return (
    <Card aria-label={t('salonEdit.tab.profile')}>
      <div className="wab-stack">
        <div className="wab-settings__grid">
          <TextField
            label={t('salonEdit.name')}
            value={draft.name}
            error={err('name')}
            onChange={(e) => set({ name: e.target.value })}
          />
          <TextField
            label={t('salonEdit.phone')}
            dir="ltr"
            value={draft.phone}
            error={err('phone')}
            onChange={(e) => set({ phone: e.target.value.trim() })}
          />
          <TextField
            label={t('salonEdit.whatsapp')}
            dir="ltr"
            value={draft.whatsapp}
            error={err('whatsapp')}
            onChange={(e) => set({ whatsapp: e.target.value.trim() })}
          />
          <Select
            label={t('salonEdit.city')}
            value={draft.cityId}
            options={[{ value: '', label: '—' }, ...cities]}
            onChange={(e) => set({ cityId: e.target.value })}
          />
        </div>
        <TextArea
          label={t('salonEdit.description')}
          rows={3}
          value={draft.description}
          error={err('description')}
          onChange={(e) => set({ description: e.target.value })}
        />
        <TextField
          label={t('salonEdit.locationText')}
          value={draft.locationText}
          error={err('locationText')}
          onChange={(e) => set({ locationText: e.target.value })}
        />
        <div className="wab-settings__grid">
          <NumberField
            label={t('salonEdit.latitude')}
            value={draft.latitude}
            decimals={COORDINATE_DECIMALS}
            allowNegative
            error={err('location')}
            onValueChange={(latitude) => set({ latitude })}
          />
          <NumberField
            label={t('salonEdit.longitude')}
            value={draft.longitude}
            decimals={COORDINATE_DECIMALS}
            allowNegative
            onValueChange={(longitude) => set({ longitude })}
          />
        </div>
        <div className="wab-settings__grid">
          <ImageUploader
            label={t('salonEdit.cover')}
            value={
              draft.coverKey
                ? {
                    key: draft.coverKey,
                    url: profile.coverKey === draft.coverKey ? (profile.coverUrl ?? '') : '',
                  }
                : null
            }
            onChange={(v) => set({ coverKey: v?.key ?? null })}
            upload={upload('SALON_COVER')}
          />
          <ImageUploader
            label={t('salonEdit.logo')}
            value={
              draft.profileKey
                ? {
                    key: draft.profileKey,
                    url: profile.profileKey === draft.profileKey ? (profile.profileUrl ?? '') : '',
                  }
                : null
            }
            onChange={(v) => set({ profileKey: v?.key ?? null })}
            upload={upload('SALON_PROFILE')}
          />
        </div>
        {save.error ? <InlineAlert error={save.error} /> : null}
        <div>
          <Button loading={save.isPending} disabled={!hasChanges(patch)} onClick={submit}>
            {t('salonEdit.save')}
          </Button>
        </div>
      </div>
      {reason.dialog}
    </Card>
  );
}

export function ProfileTab({ salonId }: { salonId: string }) {
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getSalonsByIdProfile', salonId],
    queryFn: () => repositories.salonEdit.profile(salonId),
  });
  return (
    <AsyncView
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {q.data ? <ProfileForm key={`${q.data.id}-${q.dataUpdatedAt}`} profile={q.data} /> : null}
    </AsyncView>
  );
}
