import type { Branch, BranchInput, BranchPatch } from './branches';

/** Limits of the branch form (server contract: names 1–60, address 1–300, E.164 phones). */
export const BRANCH_NAME_MAX = 60;
export const BRANCH_ADDRESS_MAX = 300;
const E164 = /^\+[1-9][0-9]{6,14}$/;
const LAT_LIMIT = 90;
const LNG_LIMIT = 180;

/** What the branch form holds while typing (coordinates as numbers, null = empty). */
export interface BranchDraft {
  nameAr: string;
  nameEn: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  cityId: string;
  areaId: string;
  phone: string;
  whatsapp: string;
}

export type BranchField =
  'nameAr' | 'nameEn' | 'locationText' | 'location' | 'cityId' | 'areaId' | 'phone' | 'whatsapp';

export const emptyBranchDraft = (): BranchDraft => ({
  nameAr: '',
  nameEn: '',
  locationText: '',
  latitude: null,
  longitude: null,
  cityId: '',
  areaId: '',
  phone: '',
  whatsapp: '',
});

export const draftOfBranch = (b: Branch): BranchDraft => ({
  nameAr: b.name.ar,
  nameEn: b.name.en,
  locationText: b.locationText ?? '',
  latitude: b.location?.latitude ?? null,
  longitude: b.location?.longitude ?? null,
  cityId: b.cityId ?? '',
  areaId: b.areaId ?? '',
  phone: b.phone ?? '',
  whatsapp: b.whatsapp ?? '',
});

const sized = (text: string, max: number) => text.trim().length > 0 && text.trim().length <= max;

/** Fields that are wrong or missing; every field is required except WhatsApp. */
export function branchProblems(d: BranchDraft): Set<BranchField> {
  const bad = new Set<BranchField>();
  if (!sized(d.nameAr, BRANCH_NAME_MAX)) bad.add('nameAr');
  if (!sized(d.nameEn, BRANCH_NAME_MAX)) bad.add('nameEn');
  if (!sized(d.locationText, BRANCH_ADDRESS_MAX)) bad.add('locationText');
  if (
    d.latitude === null ||
    d.longitude === null ||
    Math.abs(d.latitude) > LAT_LIMIT ||
    Math.abs(d.longitude) > LNG_LIMIT
  )
    bad.add('location');
  if (!d.cityId) bad.add('cityId');
  if (!d.areaId) bad.add('areaId');
  if (!E164.test(d.phone)) bad.add('phone');
  if (d.whatsapp !== '' && !E164.test(d.whatsapp)) bad.add('whatsapp');
  return bad;
}

/** The create body of a valid draft. */
export function branchInput(d: BranchDraft): BranchInput {
  return {
    name: { ar: d.nameAr.trim(), en: d.nameEn.trim() },
    location: { latitude: d.latitude ?? 0, longitude: d.longitude ?? 0 },
    locationText: d.locationText.trim(),
    cityId: d.cityId,
    areaId: d.areaId,
    phone: d.phone,
    ...(d.whatsapp ? { whatsapp: d.whatsapp } : {}),
  };
}

/** Only what changed compared with the stored branch (an empty patch means nothing to save). */
export function branchPatch(before: Branch, d: BranchDraft): BranchPatch {
  const was = branchInput(draftOfBranch(before));
  const next = branchInput(d);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const patch: BranchPatch = {};
  const keys = ['name', 'location', 'locationText', 'cityId', 'areaId', 'phone'] as const;
  for (const key of keys)
    if (!same(was[key], next[key])) Object.assign(patch, { [key]: next[key] });
  if (d.whatsapp !== (before.whatsapp ?? '')) patch.whatsapp = d.whatsapp || null;
  return patch;
}

export const isEmptyPatch = (patch: BranchPatch): boolean => Object.keys(patch).length === 0;
