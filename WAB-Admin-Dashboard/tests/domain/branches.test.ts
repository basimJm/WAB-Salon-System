import { describe, expect, it } from 'vitest';
import {
  branchInput,
  branchPatch,
  branchProblems,
  draftOfBranch,
  emptyBranchDraft,
  isEmptyPatch,
} from '@/domain/shared/branchDraft';
import {
  blockingBookingIds,
  branchActions,
  branchName,
  sortBranches,
  staffCountByBranch,
  type Branch,
} from '@/domain/shared/branches';

const base: Branch = {
  id: 'b1',
  name: { ar: 'عبدون', en: 'Abdoun' },
  isMain: true,
  status: 'ACTIVE',
  location: { latitude: 31.9, longitude: 35.9 },
  locationText: 'Street 1',
  cityId: 'c1',
  areaId: 'a1',
  phone: '+962790000001',
  whatsapp: null,
  weeklySchedule: [],
  offline: null,
  completeness: { missing: [], isComplete: true },
};
const b = (over: Partial<Branch>): Branch => ({ ...base, ...over });

describe('branchActions (§5.16)', () => {
  it('main active branch: offline only (cannot be closed or made main again)', () => {
    expect(branchActions(base)).toEqual(['offline']);
  });
  it('other active branch: main, offline, close', () => {
    expect(branchActions(b({ isMain: false }))).toEqual(['main', 'offline', 'close']);
  });
  it('offline branch: online and close, not main', () => {
    expect(branchActions(b({ isMain: false, status: 'OFFLINE' }))).toEqual(['online', 'close']);
  });
  it('closed branch: nothing', () => {
    expect(branchActions(b({ isMain: false, status: 'CLOSED' }))).toEqual([]);
  });
});

describe('branch helpers', () => {
  it('names fall back to the other language', () => {
    expect(branchName({ ar: '', en: 'Main' }, 'ar')).toBe('Main');
    expect(branchName({ ar: 'عبدون', en: 'Abdoun' }, 'ar')).toBe('عبدون');
  });
  it('sorts main first, closed last, the rest by name', () => {
    const rows = [
      b({ id: 'z', isMain: false, status: 'CLOSED', name: { ar: 'أ', en: 'A' } }),
      b({ id: 'y', isMain: false, name: { ar: 'ك', en: 'Khalda' } }),
      b({ id: 'x', isMain: false, name: { ar: 'د', en: 'Dabouq' } }),
      b({ id: 'm' }),
    ];
    expect(sortBranches(rows, 'en').map((r) => r.id)).toEqual(['m', 'x', 'y', 'z']);
  });
  it('counts staff per branch and skips owners', () => {
    const counts = staffCountByBranch([{ branchId: null }, { branchId: 'b1' }, { branchId: 'b1' }]);
    expect(counts.get('b1')).toBe(2);
    expect(counts.size).toBe(1);
  });
  it('reads the blocking booking ids of a refused close only', () => {
    const err = {
      code: 'BRANCH_HAS_UPCOMING_BOOKINGS',
      details: [{ field: 'k1' }, { field: '' }, {}],
    };
    expect(blockingBookingIds(err)).toEqual(['k1']);
    expect(blockingBookingIds({ code: 'LAST_BRANCH', details: [{ field: 'k1' }] })).toEqual([]);
    expect(blockingBookingIds(null)).toEqual([]);
    expect(blockingBookingIds({ code: 'BRANCH_HAS_UPCOMING_BOOKINGS' })).toEqual([]);
  });
});

describe('branch draft', () => {
  it('an empty draft reports every required field, but not WhatsApp', () => {
    expect([...branchProblems(emptyBranchDraft())].sort()).toEqual(
      ['areaId', 'cityId', 'location', 'locationText', 'nameAr', 'nameEn', 'phone'].sort(),
    );
  });
  it('rejects too long names, bad coordinates and bad phones', () => {
    const d = {
      ...draftOfBranch(base),
      nameEn: 'x'.repeat(61),
      latitude: 91,
      whatsapp: '0790',
      phone: '0790000000',
    };
    expect([...branchProblems(d)].sort()).toEqual(['location', 'nameEn', 'phone', 'whatsapp']);
  });
  it('a stored branch is a valid draft and builds the create body (no empty WhatsApp)', () => {
    const d = draftOfBranch(base);
    expect(branchProblems(d).size).toBe(0);
    const input = branchInput({ ...d, nameEn: '  Abdoun  ' });
    expect(input.name.en).toBe('Abdoun');
    expect('whatsapp' in input).toBe(false);
    expect(branchInput({ ...d, whatsapp: '+962790000009' }).whatsapp).toBe('+962790000009');
  });
  it('the patch holds only what changed; clearing WhatsApp sends null', () => {
    const before = b({ whatsapp: '+962790000002' });
    expect(isEmptyPatch(branchPatch(before, draftOfBranch(before)))).toBe(true);
    const patch = branchPatch(before, {
      ...draftOfBranch(before),
      phone: '+962790000003',
      whatsapp: '',
    });
    expect(patch).toEqual({ phone: '+962790000003', whatsapp: null });
    const moved = branchPatch(before, { ...draftOfBranch(before), latitude: 32 });
    expect(moved).toEqual({ location: { latitude: 32, longitude: 35.9 } });
  });
});
