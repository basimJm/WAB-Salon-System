import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  validatePlacement,
  type Placement,
  type PlacementsRepository,
} from '@/domain/placements/placements';
import type { SalonGender } from '@/domain/salons/salons';
import { localDateOf, localDayRange } from '@/domain/shared/time';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import { DateField } from '../components/form/DateField';
import { TextField } from '../components/form/TextField';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { instantDay } from './placementDays';

const dayStart = (d: string) => (d ? localDayRange(d).start.toISOString() : null);
const dayEnd = (d: string) => (d ? localDayRange(d).end.toISOString() : null);

function initialForm(item: Placement | null) {
  if (!item)
    return {
      salonId: '',
      start: localDateOf(new Date()),
      end: '',
      order: '',
      amount: '',
      note: '',
      reason: '',
    };
  return {
    salonId: item.salon.id,
    start: instantDay(item.startAt, false),
    end: instantDay(item.endAt, true),
    order: String(item.order),
    amount: item.amountPaid,
    note: item.note ?? '',
    reason: '',
  };
}

function submitPlacement(
  repo: PlacementsRepository,
  item: Placement | null,
  v: {
    salonId: string;
    start: string;
    end: string;
    order: string;
    amount: string;
    note: string;
    reason: string;
  },
) {
  const base = {
    startAt: dayStart(v.start),
    endAt: dayEnd(v.end),
    amountPaid: v.amount,
    ...(v.order ? { order: Number(v.order) } : {}),
  };
  const note = v.note.trim();
  return item
    ? repo.update(item.id, { ...base, note: note || null }, v.reason.trim())
    : repo.create({ ...base, salonId: v.salonId, ...(note ? { note } : {}) }, v.reason.trim());
}

/** Add a salon to the Recommended list, or edit its period, order, amount and note. */
export function PlacementDrawer({
  item,
  gender,
  onClose,
}: {
  item: Placement | null;
  gender: SalonGender;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [v, setV] = useState(() => initialForm(item));
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const salons = useQuery({
    queryKey: ['getSalons', 'placement-options', gender],
    queryFn: () =>
      repositories.salons.list({ page: 1, pageSize: MAX_PAGE_SIZE, gender, state: 'LIVE' }),
    enabled: item === null,
  });
  const save = useMutation({
    mutationFn: () => submitPlacement(repositories.placements, item, v),
    onSuccess: async () => {
      toast.show(t('placements.saved'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getRecommended'] });
      onClose();
    },
  });
  const submit = () => {
    const found = new Set<string>(validatePlacement(v, item === null));
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size === 0) save.mutate();
  };
  const err = (k: string) => (bad.has(k) ? t(`placements.error.${k}`) : undefined);
  return (
    <ResourceDrawer
      title={t(item ? 'placements.edit' : 'placements.add')}
      reason={v.reason}
      reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
      onReason={(reason) => setV({ ...v, reason })}
      saving={save.isPending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      {item ? (
        <p className="wab-field__hint">{item.salon.name}</p>
      ) : (
        <Select
          label={t('placements.salon')}
          value={v.salonId}
          options={[
            { value: '', label: t('placements.chooseSalon') },
            ...(salons.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
          onChange={(e) => setV({ ...v, salonId: e.target.value })}
          error={err('salonId')}
        />
      )}
      <DateField
        label={t('placements.start')}
        value={v.start}
        onValueChange={(start) => setV({ ...v, start })}
      />
      <DateField
        label={t('placements.end')}
        hint={t('placements.endHint')}
        value={v.end}
        onValueChange={(end) => setV({ ...v, end })}
        error={err('period')}
      />
      <TextField
        label={t('placements.amount')}
        dir="ltr"
        value={v.amount}
        error={err('amount')}
        onChange={(e) => setV({ ...v, amount: e.target.value })}
      />
      <TextField
        label={t('placements.order')}
        inputMode="numeric"
        dir="ltr"
        hint={t('placements.orderHint')}
        value={v.order}
        error={err('order')}
        onChange={(e) => setV({ ...v, order: e.target.value })}
      />
      <TextField
        label={t('placements.note')}
        value={v.note}
        error={err('note')}
        onChange={(e) => setV({ ...v, note: e.target.value })}
      />
    </ResourceDrawer>
  );
}
