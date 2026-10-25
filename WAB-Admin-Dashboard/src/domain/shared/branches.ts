/**
 * Salon branches (BUSINESS_DOMAIN §3.3a, §5.16). Shared kernel: salons, salon editing, bookings, reviews and the
 * finance screens all name a branch, and feature slices must not import each other.
 */
export const BRANCH_STATUSES = ['ACTIVE', 'OFFLINE', 'CLOSED'] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export interface BranchName {
  readonly ar: string;
  readonly en: string;
}

export interface BranchDay {
  readonly day: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  readonly isOff: boolean;
  readonly open: string;
  readonly close: string;
}

export interface Branch {
  readonly id: string;
  readonly name: BranchName;
  readonly isMain: boolean;
  readonly status: BranchStatus;
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly locationText: string | null;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly weeklySchedule: readonly BranchDay[];
  readonly offline: { readonly reason: string; readonly at: string } | null;
  /** Branch-level parts still missing before the branch can take bookings (§5.2). */
  readonly completeness: { readonly missing: readonly string[]; readonly isComplete: boolean };
}

export interface BranchInput {
  name: BranchName;
  location: { latitude: number; longitude: number };
  locationText: string;
  cityId: string;
  areaId: string;
  phone: string;
  whatsapp?: string;
}

/** Only the changed fields; `whatsapp: null` removes the number. */
export type BranchPatch = Partial<Omit<BranchInput, 'whatsapp'>> & { whatsapp?: string | null };

/** State changes, each with a reason (offline: the reason is also shown to the owner). */
export type BranchAction = 'main' | 'offline' | 'online' | 'close';

export interface BranchesRepository {
  /** Every branch of the salon, main first (closed ones included: history is kept). */
  list(salonId: string): Promise<readonly Branch[]>;
  create(salonId: string, input: BranchInput, reason: string): Promise<Branch>;
  update(salonId: string, branchId: string, patch: BranchPatch, reason: string): Promise<Branch>;
  /** Close answers 409 BRANCH_HAS_UPCOMING_BOOKINGS (booking ids in `details[].field`) or 422 LAST_BRANCH. */
  act(salonId: string, branchId: string, action: BranchAction, reason: string): Promise<Branch>;
}

/**
 * What an admin can do with a branch. The main branch cannot be closed (choose a new main first, §5.16) and only
 * an active branch can become the main one; closed branches are history only.
 */
export function branchActions(branch: Branch): BranchAction[] {
  if (branch.status === 'CLOSED') return [];
  const actions: BranchAction[] = [];
  if (!branch.isMain && branch.status === 'ACTIVE') actions.push('main');
  actions.push(branch.status === 'ACTIVE' ? 'offline' : 'online');
  if (!branch.isMain) actions.push('close');
  return actions;
}

/** Display name in the admin's language, falling back to the other language when one is empty. */
export const branchName = (name: BranchName, language: 'ar' | 'en'): string =>
  name[language] || name[language === 'ar' ? 'en' : 'ar'];

/** Main first, then open branches by name, closed ones last. */
export function sortBranches(branches: readonly Branch[], language: 'ar' | 'en'): Branch[] {
  const rank = (b: Branch) => (b.isMain ? 0 : b.status === 'CLOSED' ? 2 : 1);
  return [...branches].sort(
    (x, y) =>
      rank(x) - rank(y) || branchName(x.name, language).localeCompare(branchName(y.name, language)),
  );
}

/** Staff per branch from the members list (owners have no branch and are not counted). */
export function staffCountByBranch(
  members: readonly { readonly branchId: string | null }[],
): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  for (const m of members) if (m.branchId) out.set(m.branchId, (out.get(m.branchId) ?? 0) + 1);
  return out;
}

/** Booking ids the server lists when a close is refused (`409 BRANCH_HAS_UPCOMING_BOOKINGS`). */
export function blockingBookingIds(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) return [];
  const e = error as { code?: unknown; details?: unknown };
  if (e.code !== 'BRANCH_HAS_UPCOMING_BOOKINGS' || !Array.isArray(e.details)) return [];
  return e.details
    .map((d: unknown) =>
      typeof d === 'object' && d !== null ? (d as { field?: unknown }).field : undefined,
    )
    .filter((f): f is string => typeof f === 'string' && f.length > 0);
}
