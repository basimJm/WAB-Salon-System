import type { MockRoute } from './mockTransport';
import { salonHoursRoutes } from './salonEditHoursRoutes';
import { salonMenuRoutes } from './salonEditMenuRoutes';
import { salonProfileRoutes } from './salonEditProfileRoutes';
import { salonEditStore } from './salonEditState';

export { MOCK_CATALOG_SERVICE } from './salonEditState';

export function salonEditRoutes(): readonly MockRoute[] {
  const of = salonEditStore();
  return [...salonProfileRoutes(of), ...salonHoursRoutes(of), ...salonMenuRoutes(of)];
}
