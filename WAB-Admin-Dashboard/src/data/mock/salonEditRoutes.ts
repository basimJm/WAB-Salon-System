import type { MockRoute } from './mockTransport';
import { salonHoursRoutes } from './salonEditHoursRoutes';
import { salonMenuRoutes } from './salonEditMenuRoutes';
import { salonProfileRoutes } from './salonEditProfileRoutes';
import { salonEditStore } from './salonEditState';
import { MOCK_BRANCHES } from './branchesFixture';

const isMainBranch = (salonId: string | undefined, branchId: string) =>
  (MOCK_BRANCHES[salonId ?? ''] ?? []).some((b) => b.id === branchId && b.isMain);

export { MOCK_CATALOG_SERVICE } from './salonEditState';

export function salonEditRoutes(): readonly MockRoute[] {
  const store = salonEditStore();
  // Branch-scoped data (hours, closures, services) lives per branch; the main branch is the salon default.
  const of = (id: string | undefined, branchId?: string | null) =>
    store(branchId && !isMainBranch(id, branchId) ? `${id ?? ''}:${branchId}` : id);
  return [...salonProfileRoutes(store), ...salonHoursRoutes(of), ...salonMenuRoutes(of)];
}
