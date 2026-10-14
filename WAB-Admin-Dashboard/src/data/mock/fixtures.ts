import { OPERATIONS } from '../contract/generated/operations';
import { getSettingsDataSchema } from '../contract/generated/dto';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const settingsEndpoint = defineEndpoint(OPERATIONS.getSettings, { data: getSettingsDataSchema });

/** Fixtures served by the mock transport. Each feature task adds its endpoints here, typed by the contract. */
export const MOCK_ROUTES: readonly MockRoute[] = [
  mockRoute(settingsEndpoint, () => ({
    data: [
      { key: 'booking.slotMinutes', value: 15, default: 15, isDefault: true },
      { key: 'otp.length', value: 6, default: 6, isDefault: true },
    ],
    meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    empty: [],
  })),
];
