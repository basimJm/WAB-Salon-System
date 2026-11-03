import { describe, expect, it } from 'vitest';
import { ERROR_CODE_KIND, isErrorCode } from '@/constants/errorCatalog';
import { SETTING_TABS } from '@/constants/settings';
import { optionalQuery } from '@/data/api/endpoint';
import {
  getFinanceReconciliationQuerySchema,
  getSalonsByIdDataSchema,
  putSalonsByIdHoursQuerySchema,
} from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import { MOCK_BRANCHES, bookingBranchRef, reviewBranchRef } from '@/data/mock/branchesFixture';
import { MOCK_SETTING_DEFAULTS } from '@/data/mock/settingsFixture';
import { SETTING_DEFINITIONS } from '@/domain/settings/registry';
import { parseSetting } from '@/domain/settings/validate';
import ar from '@/locales/ar';
import { SETTINGS_STRINGS } from '@/locales/lazy/settings';

import en from '@/locales/en';

const BRANCH_CODES = [
  'BRANCH_NOT_FOUND',
  'BRANCH_NOT_BOOKABLE',
  'BRANCH_REQUIRED',
  'BRANCH_LIMIT_REACHED',
  'BRANCH_HAS_UPCOMING_BOOKINGS',
  'LAST_BRANCH',
  'BRANCH_SCOPE_DENIED',
] as const;
const ID = '64b000000000000000000011';

describe('branches contract (ADM-088)', () => {
  it('knows every branch error code with a message in both languages', () => {
    for (const code of BRANCH_CODES) {
      expect(isErrorCode(code), code).toBe(true);
      expect(en.errors.codes[code], code).toBeTruthy();
      expect(ar.errors.codes[code], code).toBeTruthy();
    }
    expect(ERROR_CODE_KIND.BRANCH_NOT_FOUND).toBe('notFound');
    expect(ERROR_CODE_KIND.BRANCH_SCOPE_DENIED).toBe('forbidden');
    expect(ERROR_CODE_KIND.BRANCH_HAS_UPCOMING_BOOKINGS).toBe('conflict');
  });

  it('salon.maxBranches is editable in the branches group of the security tab, default 20', () => {
    const def = SETTING_DEFINITIONS.find((d) => d.key === 'salon.maxBranches');
    expect(def?.group).toBe('branches');
    expect(SETTING_TABS.find((t) => t.groups.includes('branches'))?.id).toBe('security');
    expect(MOCK_SETTING_DEFAULTS['salon.maxBranches']).toBe(20);
    expect(SETTINGS_STRINGS.en.settings.key.salon_maxBranches).toBeTruthy();
    expect(SETTINGS_STRINGS.ar.settings.key.salon_maxBranches).toBeTruthy();
    expect(parseSetting('0', def!).ok).toBe(false);
    expect(parseSetting('20', def!).ok).toBe(true);
  });

  it('branch query schemas accept real ids, nothing or no branch, and refuse a bad id', () => {
    const branchQuery = optionalQuery(putSalonsByIdHoursQuerySchema);
    const salonBranchQuery = optionalQuery(getFinanceReconciliationQuerySchema);
    expect(branchQuery().safeParse(undefined).success).toBe(true);
    expect(branchQuery().safeParse({}).success).toBe(true);
    expect(branchQuery().safeParse({ branchId: ID }).success).toBe(true);
    expect(branchQuery().safeParse({ branchId: 'nope' }).success).toBe(false);
    expect(salonBranchQuery().safeParse({ salonId: ID, branchId: ID }).success).toBe(true);
    expect(salonBranchQuery().safeParse({ salonId: 'x' }).success).toBe(false);
  });

  it('the re-synced contract has the branch operations and query flags', () => {
    expect(OPERATIONS.getSalonsByIdBranches.path).toBe('/admin/v1/salons/{id}/branches');
    expect(OPERATIONS.postSalonsByIdBranchesByBranchIdClose.hasBody).toBe(true);
    expect(OPERATIONS.getSalonsByIdHours.hasQuery).toBe(true);
    expect(OPERATIONS.getFinanceReconciliation.hasQuery).toBe(true);
    expect(OPERATIONS.getSalonsByIdMembers.hasQuery).toBe(true);
  });

  it('mock branches: one main per salon, main first, all valid against the salon detail schema', () => {
    for (const branches of Object.values(MOCK_BRANCHES)) {
      expect(branches.filter((b) => b.isMain)).toHaveLength(1);
      expect(branches[0]?.isMain).toBe(true);
      const shape = getSalonsByIdDataSchema().shape.branches;
      expect(shape.safeParse(branches).success).toBe(true);
    }
  });

  it('builds the booking and review branch refs, null for an unknown id', () => {
    expect(bookingBranchRef(ID)).toEqual({
      id: ID,
      name: 'Abdoun',
      locationText: 'Abdoun street 11',
    });
    expect(reviewBranchRef(ID)?.name).toEqual({ ar: 'عبدون', en: 'Abdoun' });
    expect(bookingBranchRef('missing')).toBeNull();
    expect(reviewBranchRef('missing')).toBeNull();
  });
});
