import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ITEM_STATUSES,
  itemInputOf,
  MAX_ITEM_DESCRIPTION,
  MAX_ITEM_NAME,
  validateItemForm,
  type Item,
  type ItemDraft,
  type ItemInput,
} from '@/domain/items/items';
import { TextArea } from '../components/form/TextArea';
import { TextField } from '../components/form/TextField';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';

const BLANK: ItemDraft & { reason: string } = {
  name: '',
  description: '',
  status: 'ACTIVE',
  reason: '',
};

const initial = (item: Item | null) =>
  item
    ? { name: item.name, description: item.description ?? '', status: item.status, reason: '' }
    : BLANK;

export interface ItemDrawerProps {
  item: Item | null;
  saving: boolean;
  error: unknown;
  onSubmit: (value: ItemInput, reason: string) => void;
  onClose: () => void;
}

/** Create / edit panel of one item: name, description, status and the mandatory audit reason. */
export function ItemDrawer({ item, saving, error, onSubmit, onClose }: ItemDrawerProps) {
  const { t } = useTranslation();
  const [v, setV] = useState(() => initial(item));
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>(validateItemForm(v));
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size > 0) return;
    onSubmit(itemInputOf(v), v.reason.trim());
  };
  return (
    <ResourceDrawer
      title={t(item ? 'items.edit' : 'items.add')}
      reason={v.reason}
      reasonErr={bad.has('reason') ? 'reason.required' : undefined}
      onReason={(reason) => setV({ ...v, reason })}
      saving={saving}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={t('items.name')}
        value={v.name}
        error={bad.has('name') ? t('items.error.name', { max: MAX_ITEM_NAME }) : undefined}
        onChange={(e) => setV({ ...v, name: e.target.value })}
      />
      <TextArea
        label={t('items.description')}
        value={v.description}
        rows={3}
        error={
          bad.has('description')
            ? t('items.error.description', { max: MAX_ITEM_DESCRIPTION })
            : undefined
        }
        onChange={(e) => setV({ ...v, description: e.target.value })}
      />
      <Select
        label={t('common.status')}
        value={v.status}
        options={ITEM_STATUSES.map((s) => ({ value: s, label: t(`status.item.${s}`) }))}
        onChange={(e) =>
          setV({ ...v, status: ITEM_STATUSES.find((s) => s === e.target.value) ?? v.status })
        }
      />
    </ResourceDrawer>
  );
}
