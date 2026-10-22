import { MAX_EXTRA_DESCRIPTION, isServiceDuration, isServicePrice } from './rules';
import type { NewService, SalonService, ServicePatch } from './salonEdit';

/** What the service form holds. */
export interface ServiceDraft {
  catalogServiceId: string;
  price: string;
  minutes: number | null;
  brideOnly: boolean;
  extra: string;
  active: boolean;
}

export type ServiceField = 'catalog' | 'price' | 'minutes' | 'extra';

export const serviceDraftOf = (s: SalonService | null, firstCatalogId: string): ServiceDraft => ({
  catalogServiceId: s?.catalogServiceId ?? firstCatalogId,
  price: s?.price ?? '',
  minutes: s?.durationMinutes ?? null,
  brideOnly: s?.brideOnly ?? false,
  extra: s?.extraDescription ?? '',
  active: s?.active ?? true,
});

export function serviceProblems(d: ServiceDraft): ReadonlySet<ServiceField> {
  const bad = new Set<ServiceField>();
  if (d.catalogServiceId === '') bad.add('catalog');
  if (!isServicePrice(d.price)) bad.add('price');
  if (d.minutes === null || !isServiceDuration(d.minutes)) bad.add('minutes');
  if (d.extra.length > MAX_EXTRA_DESCRIPTION) bad.add('extra');
  return bad;
}

/** Call only when `serviceProblems` is empty. */
export function newServiceOf(d: ServiceDraft): NewService {
  const extra = d.extra.trim();
  return {
    catalogServiceId: d.catalogServiceId,
    price: d.price,
    durationMinutes: d.minutes ?? 0,
    brideOnly: d.brideOnly,
    active: d.active,
    ...(extra ? { extraDescription: extra } : {}),
  };
}

/** Call only when `serviceProblems` is empty; an empty description clears it. */
export function servicePatchOf(d: ServiceDraft): ServicePatch {
  const extra = d.extra.trim();
  return {
    price: d.price,
    durationMinutes: d.minutes ?? 0,
    brideOnly: d.brideOnly,
    active: d.active,
    extraDescription: extra === '' ? null : extra,
  };
}
