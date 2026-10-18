import { useState } from 'react';
import { MIN_REASON_LENGTH } from '@/constants/ui';
import type { LocalizedName } from '@/domain/locations/locations';

export interface LocationFormValues {
  nameAr: string;
  nameEn: string;
  sortOrder: string;
  active: boolean;
  reason: string;
}

export type LocationFormErrors = Partial<Record<keyof LocationFormValues, string>>;

interface Existing {
  name: LocalizedName;
  sortOrder: number;
  active: boolean;
}

const WHOLE = /^\d+$/;
const MAX_SORT = 100_000;

export const emptyLocationForm = (item: Existing | null): LocationFormValues => ({
  nameAr: item?.name.ar ?? '',
  nameEn: item?.name.en ?? '',
  sortOrder: String(item?.sortOrder ?? 0),
  active: item?.active ?? true,
  reason: '',
});

/** Checks the fields every location has; returns i18n keys (empty = valid). */
export function validateLocationForm(v: LocationFormValues): LocationFormErrors {
  const errors: LocationFormErrors = {};
  if (!v.nameAr.trim()) errors.nameAr = 'locations.error.required';
  if (!v.nameEn.trim()) errors.nameEn = 'locations.error.required';
  if (!WHOLE.test(v.sortOrder) || Number(v.sortOrder) > MAX_SORT)
    errors.sortOrder = 'locations.error.sortOrder';
  if (v.reason.trim().length < MIN_REASON_LENGTH) errors.reason = 'locations.error.reason';
  return errors;
}

/** The values shared by every location kind, plus their validation. Pages add their own fields beside them. */
export function useLocationForm(item: Existing | null) {
  const [values, setValues] = useState<LocationFormValues>(() => emptyLocationForm(item));
  const [errors, setErrors] = useState<LocationFormErrors>({});
  return {
    values,
    errors,
    set: <K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) =>
      setValues((v) => ({ ...v, [key]: value })),
    /** True when the shared fields are valid; shows the errors otherwise. */
    check: (extra: LocationFormErrors = {}) => {
      const all = { ...validateLocationForm(values), ...extra };
      setErrors(all);
      return Object.keys(all).length === 0;
    },
  };
}

export const toName = (v: LocationFormValues): LocalizedName => ({
  ar: v.nameAr.trim(),
  en: v.nameEn.trim(),
});
