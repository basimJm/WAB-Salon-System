import { OPERATIONS } from '../contract/generated/operations';
import {
  getSettingsDataSchema,
  putSettingsByKeyBodySchema,
  putSettingsByKeyDataSchema,
} from '../contract/generated/dto';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import { MOCK_SETTING_DEFAULTS } from './settingsFixture';
import type { MockRoute } from './mockTransport';

const settingsEndpoint = defineEndpoint(OPERATIONS.getSettings, { data: getSettingsDataSchema });
const updateSettingEndpoint = defineEndpoint(OPERATIONS.putSettingsByKey, {
  data: putSettingsByKeyDataSchema,
  body: putSettingsByKeyBodySchema,
});

/**
 * Fixtures served by the mock transport, typed by the contract. State lives in the closure, so every
 * app container (and every test) gets its own copy. Each feature task adds its endpoints here.
 */
export function createMockRoutes(): readonly MockRoute[] {
  const overrides = new Map<string, unknown>();
  const entry = (key: string) => {
    const def = MOCK_SETTING_DEFAULTS[key];
    const isDefault = !overrides.has(key);
    return { key, value: isDefault ? def : overrides.get(key), default: def, isDefault };
  };
  return [
    mockRoute(settingsEndpoint, () => {
      const data = Object.keys(MOCK_SETTING_DEFAULTS).map(entry);
      return {
        data,
        meta: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 },
        empty: [],
      };
    }),
    mockRoute(updateSettingEndpoint, ({ params, body }) => {
      const key = params['key'] ?? '';
      overrides.set(key, (body as { value: unknown }).value);
      return { data: entry(key) };
    }),
  ];
}
