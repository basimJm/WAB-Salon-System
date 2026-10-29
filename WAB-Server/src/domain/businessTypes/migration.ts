import { GENDERS, type Gender } from '../../constants/enums';
import {
  BUSINESS_TYPE_MIGRATION_TARGETS,
  type BusinessTypeMigrationTarget,
} from '../../constants/businessTypes';
import type { Logger } from '../../utils/logger';

/**
 * Where the old single-gender field of one collection goes (BUSINESS_DOMAIN.md §5.19 migration):
 * `from` (MALE|FEMALE) becomes `to`, and `businessType` = SALON (every business before clinics
 * existed was a salon).
 */
export interface BusinessTypeFieldMove {
  readonly from: string;
  readonly to: string;
}

export const BUSINESS_TYPE_FIELD_MOVES: Readonly<
  Record<BusinessTypeMigrationTarget, BusinessTypeFieldMove>
> = {
  salons: { from: 'gender', to: 'audience' },
  catalogServices: { from: 'gender', to: 'audience' },
  recommendedPlacements: { from: 'gender', to: 'audience' },
  bookings: { from: 'salonGender', to: 'salonAudience' },
};

/** Storage the migration needs; the Mongo one is in `migrationStore.ts`, tests use a fake. */
export interface BusinessTypeMigrationStore {
  /** Rows of `target` without `businessType` whose old field holds `value`. */
  countPending(
    target: BusinessTypeMigrationTarget,
    move: BusinessTypeFieldMove,
    value: Gender,
  ): Promise<number>;
  /**
   * Sets `businessType` = SALON and `move.to` = `value`, removes `move.from`, on the rows of
   * `target` without `businessType` whose old field holds `value`; returns how many changed.
   */
  migrate(
    target: BusinessTypeMigrationTarget,
    move: BusinessTypeFieldMove,
    value: Gender,
  ): Promise<number>;
}

export type BusinessTypeMigrationReport = Record<BusinessTypeMigrationTarget, number>;

/**
 * Gives every row written before business types existed its `businessType` (SALON) and audience
 * (the old gender). Idempotent: only rows without `businessType` are touched, so a second run
 * changes nothing. A dry run counts what would change.
 */
export const migrateBusinessTypes = async (deps: {
  readonly store: BusinessTypeMigrationStore;
  readonly dryRun?: boolean;
  readonly logger?: Pick<Logger, 'info'>;
}): Promise<BusinessTypeMigrationReport> => {
  const report = {} as Record<BusinessTypeMigrationTarget, number>;
  for (const target of BUSINESS_TYPE_MIGRATION_TARGETS) {
    const move = BUSINESS_TYPE_FIELD_MOVES[target];
    let changed = 0;
    for (const gender of GENDERS) {
      changed +=
        deps.dryRun === true
          ? await deps.store.countPending(target, move, gender)
          : await deps.store.migrate(target, move, gender);
    }
    report[target] = changed;
  }
  deps.logger?.info({ report, dryRun: deps.dryRun === true }, 'business type migration');
  return report;
};
