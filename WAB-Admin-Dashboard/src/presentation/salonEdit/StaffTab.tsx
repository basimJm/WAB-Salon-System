import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { BIO_MAX, MAX_YEARS, staffDayProblems } from '@/domain/salonEdit/rules';
import {
  WEEK_DAYS,
  type BranchScope,
  type SalonService,
  type StaffInput,
  type StaffProfile,
} from '@/domain/salonEdit/salonEdit';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { MultiSelect } from '../components/form/MultiSelect';
import { NumberField } from '../components/form/NumberField';
import { Select } from '../components/form/Select';
import { TextArea } from '../components/form/TextArea';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { useReasonAction } from '../hooks/useReasonAction';
import type { Branch } from '@/domain/shared/branches';
import { MoveMemberPanel } from './MoveMemberPanel';
import { useSalonMutation } from './useSalonMutation';

interface Day {
  on: boolean;
  start: string;
  end: string;
}

function daysOf(profile: StaffProfile): Record<string, Day> {
  return Object.fromEntries(
    WEEK_DAYS.map((d) => {
      const row = profile.workingDays.find((w) => w.day === d);
      return [d, { on: row !== undefined, start: row?.start ?? '', end: row?.end ?? '' }];
    }),
  );
}

function StaffForm({
  salonId,
  profile,
  services,
  allowBride,
}: {
  salonId: string;
  profile: StaffProfile;
  services: readonly SalonService[];
  allowBride: boolean;
}) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [v, setV] = useState({
    provides: profile.providesServices,
    bio: profile.bio ?? '',
    years: profile.yearsOfExperience,
    serviceIds: [...profile.serviceIds],
    bride: profile.brideQualified,
    days: daysOf(profile),
  });
  const [tried, setTried] = useState(false);
  const input = (): StaffInput => ({
    providesServices: v.provides,
    ...(v.bio.trim() ? { bio: v.bio.trim() } : {}),
    ...(v.years !== null ? { yearsOfExperience: v.years } : {}),
    serviceIds: v.serviceIds,
    brideQualified: v.bride,
    workingDays: WEEK_DAYS.flatMap((d) => {
      const row = v.days[d];
      if (!row?.on) return [];
      return [
        {
          day: d,
          ...(row.start ? { start: row.start } : {}),
          ...(row.end ? { end: row.end } : {}),
        },
      ];
    }),
  });
  const save = useSalonMutation(
    (reason: string) =>
      repositories.salonEdit.saveStaff(salonId, profile.memberId, input(), reason),
    [['getSalonsByIdMembersByMemberIdStaff']],
  );
  const reason = useReasonAction(save.isPending);
  const dayBad = new Set(staffDayProblems(input().workingDays));
  const bad =
    v.bio.length > BIO_MAX ||
    (v.years !== null && (v.years < 0 || v.years > MAX_YEARS)) ||
    dayBad.size > 0;
  const setDay = (d: string, change: Partial<Day>) =>
    setV({ ...v, days: { ...v.days, [d]: { ...(v.days[d] as Day), ...change } } });
  return (
    <Card aria-label={t('salonEdit.tab.staff')}>
      <div className="wab-stack">
        <Toggle
          kind="switch"
          label={t('salonEdit.providesServices')}
          checked={v.provides}
          onChange={(e) => setV({ ...v, provides: e.target.checked })}
        />
        <TextArea
          label={t('salonEdit.bio')}
          rows={3}
          value={v.bio}
          error={tried && v.bio.length > BIO_MAX ? t('salonEdit.error.bio') : undefined}
          onChange={(e) => setV({ ...v, bio: e.target.value })}
        />
        <NumberField
          label={t('salonEdit.years')}
          value={v.years}
          decimals={0}
          onValueChange={(years) => setV({ ...v, years })}
        />
        <MultiSelect
          label={t('salonEdit.skills')}
          options={services.map((s) => ({ value: s.id, label: s.name }))}
          value={v.serviceIds}
          onValueChange={(serviceIds) => setV({ ...v, serviceIds })}
        />
        {allowBride ? (
          <Toggle
            label={t('salonEdit.brideQualified')}
            checked={v.bride}
            onChange={(e) => setV({ ...v, bride: e.target.checked })}
          />
        ) : null}
        {WEEK_DAYS.map((d) => {
          const row = v.days[d] as Day;
          return (
            <div key={d} className="wab-row">
              <Toggle
                label={t(`salonEdit.day.${d}`)}
                checked={row.on}
                onChange={(e) => setDay(d, { on: e.target.checked })}
              />
              <TextField
                label={t('salonEdit.from')}
                type="time"
                dir="ltr"
                disabled={!row.on}
                value={row.start}
                onChange={(e) => setDay(d, { start: e.target.value })}
                error={tried && dayBad.has(d) ? t('salonEdit.error.hours') : undefined}
              />
              <TextField
                label={t('salonEdit.to')}
                type="time"
                dir="ltr"
                disabled={!row.on}
                value={row.end}
                onChange={(e) => setDay(d, { end: e.target.value })}
              />
            </div>
          );
        })}
        {save.error ? <InlineAlert error={save.error} /> : null}
        <div>
          <Button
            loading={save.isPending}
            onClick={() => {
              setTried(true);
              if (!bad) reason.ask((r) => save.mutate(r));
            }}
          >
            {t('salonEdit.save')}
          </Button>
        </div>
      </div>
      {reason.dialog}
    </Card>
  );
}

export interface StaffTabProps {
  scope: BranchScope;
  gender: 'MALE' | 'FEMALE';
  branches: readonly Branch[];
}

export function StaffTab({ scope, gender, branches }: StaffTabProps) {
  const { salonId } = scope;
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const members = useQuery({
    queryKey: ['getSalonsByIdMembers', scope],
    queryFn: () => repositories.salons.members(salonId, scope.branchId),
  });
  const services = useQuery({
    queryKey: ['getSalonsByIdServices', scope],
    queryFn: () => repositories.salonEdit.services(scope),
  });
  const [picked, setPicked] = useState('');
  const inBranch = members.data?.some((m) => m.id === picked) ? picked : '';
  const memberId = inBranch || members.data?.[0]?.id || '';
  const staff = useQuery({
    queryKey: ['getSalonsByIdMembersByMemberIdStaff', salonId, memberId],
    queryFn: () => repositories.salonEdit.staff(salonId, memberId),
    enabled: memberId !== '',
  });
  return (
    <AsyncView
      loading={members.isPending}
      error={members.error ?? services.error}
      onRetry={() => void members.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {members.data && members.data.length === 0 ? (
        <p>{t(scope.branchId ? 'salonEdit.noBranchMembers' : 'salonEdit.noMembers')}</p>
      ) : null}
      <div className="wab-stack">
        <Select
          label={t('salonEdit.member')}
          value={memberId}
          options={(members.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
          onChange={(e) => setPicked(e.target.value)}
        />
        <MoveMemberPanel scope={scope} memberId={memberId} branches={branches} />
        <AsyncView
          loading={staff.isPending || services.isPending}
          error={staff.error}
          onRetry={() => void staff.refetch()}
          skeleton={<Skeleton height="lg" />}
        >
          {staff.data && services.data ? (
            <StaffForm
              key={`${memberId}-${staff.dataUpdatedAt}`}
              salonId={salonId}
              profile={staff.data}
              services={services.data}
              allowBride={gender === 'FEMALE'}
            />
          ) : null}
        </AsyncView>
      </div>
    </AsyncView>
  );
}
