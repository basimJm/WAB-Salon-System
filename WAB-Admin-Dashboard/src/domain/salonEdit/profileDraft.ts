import {
  DESCRIPTION_MAX,
  E164,
  LOCATION_TEXT_MAX,
  NAME_MAX,
  NAME_MIN,
  isLatitude,
  isLongitude,
} from './rules';
import type { ProfilePatch, SalonProfile } from './salonEdit';

/** What the profile form holds: text as typed, coordinates as numbers (null = empty). */
export interface ProfileDraft {
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  cityId: string;
  coverKey: string | null;
  profileKey: string | null;
}

export type ProfileField = keyof ProfileDraft | 'location';

export function draftOf(p: SalonProfile): ProfileDraft {
  return {
    name: p.name,
    description: p.description ?? '',
    phone: p.phone ?? '',
    whatsapp: p.whatsapp ?? '',
    locationText: p.locationText ?? '',
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    cityId: p.cityId ?? '',
    coverKey: p.coverKey,
    profileKey: p.profileKey,
  };
}

/** Fields that cannot be saved yet. */
export function profileProblems(d: ProfileDraft): ReadonlySet<ProfileField> {
  const bad = new Set<ProfileField>();
  const name = d.name.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) bad.add('name');
  if (d.description.length > DESCRIPTION_MAX) bad.add('description');
  if (d.phone !== '' && !E164.test(d.phone)) bad.add('phone');
  if (d.whatsapp !== '' && !E164.test(d.whatsapp)) bad.add('whatsapp');
  if (d.locationText.length > LOCATION_TEXT_MAX) bad.add('locationText');
  const hasLat = d.latitude !== null;
  const hasLng = d.longitude !== null;
  if (
    hasLat !== hasLng ||
    (d.latitude !== null && !isLatitude(d.latitude)) ||
    (d.longitude !== null && !isLongitude(d.longitude))
  )
    bad.add('location');
  return bad;
}

const blankToNull = (text: string): string | null => (text.trim() === '' ? null : text.trim());

function textPatch(p: SalonProfile, d: ProfileDraft): ProfilePatch {
  const patch: ProfilePatch = {};
  if (d.name.trim() !== p.name) patch.name = d.name.trim();
  if (blankToNull(d.description) !== p.description) patch.description = blankToNull(d.description);
  if (d.phone !== (p.phone ?? '') && d.phone !== '') patch.phone = d.phone;
  if (blankToNull(d.whatsapp) !== p.whatsapp) patch.whatsapp = blankToNull(d.whatsapp);
  if (blankToNull(d.locationText) !== p.locationText)
    patch.locationText = blankToNull(d.locationText);
  if (d.cityId !== '' && d.cityId !== p.cityId) patch.cityId = d.cityId;
  return patch;
}

function mediaAndPlacePatch(p: SalonProfile, d: ProfileDraft): ProfilePatch {
  const patch: ProfilePatch = {};
  const before = p.location;
  const same = before?.latitude === d.latitude && before?.longitude === d.longitude;
  const empty = before === null && d.latitude === null && d.longitude === null;
  if (!same && !empty) {
    patch.location =
      d.latitude !== null && d.longitude !== null
        ? { latitude: d.latitude, longitude: d.longitude }
        : null;
  }
  if (d.coverKey !== p.coverKey) patch.coverKey = d.coverKey;
  if (d.profileKey !== p.profileKey) patch.profileKey = d.profileKey;
  return patch;
}

/** Only the fields that differ from what the server holds (`null` clears an optional one). */
export const profilePatch = (p: SalonProfile, d: ProfileDraft): ProfilePatch => ({
  ...textPatch(p, d),
  ...mediaAndPlacePatch(p, d),
});

export const hasChanges = (patch: ProfilePatch): boolean => Object.keys(patch).length > 0;
