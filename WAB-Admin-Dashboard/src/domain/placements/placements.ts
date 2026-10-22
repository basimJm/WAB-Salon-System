import type { Page, PageQuery } from '@/domain/shared/page';
import type { SalonGender } from '@/domain/salons/salons';

export const PLACEMENT_STATUSES = ['SCHEDULED', 'ACTIVE', 'ENDED'] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

/** A paid "Recommended" slot of one salon in the customer app. */
export interface Placement {
  readonly id: string;
  readonly salon: { readonly id: string; readonly name: string };
  readonly gender: SalonGender;
  readonly startAt: string;
  readonly endAt: string;
  readonly order: number;
  /** JOD decimal string. */
  readonly amountPaid: string;
  readonly note: string | null;
  readonly status: PlacementStatus;
}
export interface PlacementInput {
  salonId: string;
  startAt: string | null;
  endAt: string | null;
  order?: number;
  amountPaid: string;
  note?: string;
}
export type PlacementPatch = Partial<Omit<PlacementInput, 'salonId' | 'note'>> & {
  note?: string | null;
};

export interface PlacementsRepository {
  list(
    query: PageQuery & { gender?: SalonGender; status?: PlacementStatus },
  ): Promise<Page<Placement>>;
  create(input: PlacementInput, reason: string): Promise<Placement>;
  update(id: string, patch: PlacementPatch, reason: string): Promise<Placement>;
  /** Ends the placement now; it stays in the history as ENDED. */
  end(id: string, reason: string): Promise<Placement>;
  /** New order of one audience's placements: the ids from first to last. */
  reorder(
    gender: SalonGender,
    ids: readonly string[],
    reason: string,
  ): Promise<readonly Placement[]>;
}

/** Moves one item up (-1) or down (+1) in a list; out-of-range moves leave it unchanged. */
export { moveId } from '@/domain/shared/order';
export const MAX_NOTE = 500;
export const MAX_REORDER = 200;

export type PlacementError = 'salonId' | 'amount' | 'period' | 'order' | 'note';
export interface PlacementForm {
  salonId: string;
  start: string;
  end: string;
  order: string;
  amount: string;
  note: string;
}
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const JOD = /^\d+(\.\d{1,3})?$/;

const periodOk = (start: string, end: string): boolean =>
  (!start || DAY.test(start)) && (!end || DAY.test(end)) && !(start && end && end < start);

/** Form rules: a salon (when adding), an amount, a sensible period, a whole order, a short note. */
export function validatePlacement(v: PlacementForm, adding: boolean): PlacementError[] {
  const checks: ReadonlyArray<readonly [PlacementError, boolean]> = [
    ['salonId', adding && !v.salonId],
    ['amount', !JOD.test(v.amount)],
    ['period', !periodOk(v.start, v.end)],
    ['order', v.order !== '' && !/^\d+$/.test(v.order)],
    ['note', v.note.length > MAX_NOTE],
  ];
  return checks.filter(([, bad]) => bad).map(([name]) => name);
}
