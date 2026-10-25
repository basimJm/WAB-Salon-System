import type { BranchRaw } from '../../models/branch.model';
import type { Entity } from '../../utils/database/plain';

/** A point on the map in degrees. */
export interface Point {
  readonly lat: number;
  readonly lng: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in km. */
export const greatCircleKm = (from: Point, to: Point, earthRadiusKm: number): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** The branch's pin, or `null` when it has none. */
export const pointOf = (branch: {
  readonly location?: { readonly coordinates: readonly number[] } | undefined;
}): Point | null => {
  const [lng, lat] = branch.location?.coordinates ?? [];
  return lng === undefined || lat === undefined ? null : { lat, lng };
};

/**
 * The branch a one-per-salon card shows (§5.17): the nearest to the customer when their position
 * is known, else the main branch, else the first one.
 */
export const representativeBranch = (
  branches: readonly Entity<BranchRaw>[],
  here: Point | null,
  earthRadiusKm: number,
): { branch: Entity<BranchRaw>; distanceKm: number | null } | null => {
  if (branches.length === 0) return null;
  if (here !== null) {
    let best: { branch: Entity<BranchRaw>; distanceKm: number | null } | null = null;
    for (const branch of branches) {
      const point = pointOf(branch);
      if (point === null) continue;
      const distance = greatCircleKm(here, point, earthRadiusKm);
      if (best === null || (best.distanceKm ?? Number.POSITIVE_INFINITY) > distance) {
        best = { branch, distanceKm: distance };
      }
    }
    if (best !== null) return best;
  }
  const main = branches.find((b) => b.isMain) ?? branches[0];
  return main === undefined ? null : { branch: main, distanceKm: null };
};

/**
 * Salons whose branch offers every wanted catalog service, with the lowest sum of prices over
 * their branches (a salon matches when ANY branch matches, §5.17). Rows without a branch count
 * as the salon's single place.
 */
export const cheapestSums = (
  rows: readonly {
    salonId: string;
    branchId?: string | undefined;
    catalogServiceId: string;
    price: number;
  }[],
  wanted: readonly string[],
): Map<string, number> => {
  const byPlace = new Map<string, { salonId: string; prices: Map<string, number> }>();
  for (const row of rows) {
    const key = row.branchId ?? `salon:${row.salonId}`;
    const place = byPlace.get(key) ?? { salonId: row.salonId, prices: new Map<string, number>() };
    place.prices.set(row.catalogServiceId, row.price);
    byPlace.set(key, place);
  }
  const sums = new Map<string, number>();
  for (const { salonId, prices } of byPlace.values()) {
    if (!wanted.every((id) => prices.has(id))) continue;
    const sum = wanted.reduce((total, id) => total + (prices.get(id) ?? 0), 0);
    const current = sums.get(salonId);
    if (current === undefined || sum < current) sums.set(salonId, sum);
  }
  return sums;
};
