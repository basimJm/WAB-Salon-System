import { HTTP_STATUS } from '@/constants/http';
import { branchesOf, type MockBranch } from './branchesFixture';
import { MockBusinessError } from './mockTransport';

type Body = Record<string, unknown>;
const withoutReason = (body: Body): Body =>
  Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'reason'));

/** Mutable branches of the mock salons, shared by the salon detail and the branch routes of one mock server. */
export interface BranchStore {
  list(salonId: string): MockBranch[];
  find(salonId: string, branchId: string | undefined): MockBranch;
  create(salonId: string, body: Body, max: number): MockBranch;
  update(salonId: string, branchId: string | undefined, body: Body): MockBranch;
  makeMain(salonId: string, branchId: string | undefined): MockBranch;
  setStatus(
    salonId: string,
    branchId: string | undefined,
    status: MockBranch['status'],
    reason?: string,
  ): MockBranch;
}

const refuse = (status: number, code: string, fields: readonly string[] = []) =>
  new MockBusinessError(status, code, fields);

export function createBranchStore(): BranchStore {
  const bySalon = new Map<string, MockBranch[]>();
  let counter = 900;
  const list = (salonId: string) => {
    const known = bySalon.get(salonId);
    if (known) return known;
    const seeded = branchesOf(salonId);
    bySalon.set(salonId, seeded);
    return seeded;
  };
  const find = (salonId: string, branchId: string | undefined) => {
    const hit = list(salonId).find((b) => b.id === branchId);
    if (!hit) throw refuse(HTTP_STATUS.notFound, 'BRANCH_NOT_FOUND');
    return hit;
  };
  const replace = (salonId: string, next: MockBranch) => {
    bySalon.set(
      salonId,
      list(salonId).map((b) => (b.id === next.id ? next : b)),
    );
    return next;
  };
  return {
    list,
    find,
    create(salonId, body, max) {
      const open = list(salonId).filter((b) => b.status !== 'CLOSED');
      if (open.length >= max) throw refuse(HTTP_STATUS.unprocessable, 'BRANCH_LIMIT_REACHED');
      counter += 1;
      const fields = withoutReason(body);
      const created = {
        ...(fields as Pick<
          MockBranch,
          'name' | 'location' | 'locationText' | 'cityId' | 'areaId' | 'phone'
        >),
        id: `64b0${String(counter).padStart(20, '0')}`,
        isMain: list(salonId).length === 0,
        status: 'ACTIVE' as const,
        whatsapp: typeof fields['whatsapp'] === 'string' ? fields['whatsapp'] : null,
        weeklySchedule: [],
        offline: null,
        completeness: { missing: ['HOURS', 'SERVICES', 'STAFF'], isComplete: false },
      };
      bySalon.set(salonId, [...list(salonId), created]);
      return created;
    },
    update(salonId, branchId, body) {
      const fields = withoutReason(body);
      return replace(salonId, { ...find(salonId, branchId), ...(fields as Partial<MockBranch>) });
    },
    makeMain(salonId, branchId) {
      const target = find(salonId, branchId);
      if (target.status !== 'ACTIVE') throw refuse(HTTP_STATUS.unprocessable, 'INVALID_TRANSITION');
      bySalon.set(
        salonId,
        list(salonId).map((b) => ({ ...b, isMain: b.id === target.id })),
      );
      return find(salonId, branchId);
    },
    setStatus(salonId, branchId, status, reason) {
      const b = find(salonId, branchId);
      const offline =
        status === 'OFFLINE' ? { reason: reason ?? '', at: new Date().toISOString() } : null;
      return replace(salonId, { ...b, status, offline });
    },
  };
}
